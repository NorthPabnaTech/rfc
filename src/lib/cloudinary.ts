import 'server-only';

import crypto from 'node:crypto';

import { type UploadApiResponse, v2 as cloudinary } from 'cloudinary';

import type { ImageAsset } from '@/database';
import {
  isAcceptedImageFile,
  MAX_UPLOAD_BYTES,
  UPLOAD_FOLDERS,
  type UploadPurpose,
} from '@lib/constants';
import { serverEnv } from '@lib/env';
import { AppError } from '@lib/errors';

cloudinary.config({
  cloud_name: serverEnv.CLOUDINARY_CLOUD_NAME,
  api_key: serverEnv.CLOUDINARY_API_KEY,
  api_secret: serverEnv.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Longest edge we keep per purpose. Originals larger than this are scaled
 * down at upload time (an "incoming transformation"), so we never store or
 * serve multi-megapixel phone photos. Delivery-time sizing/format happens in
 * lib/images.ts via f_auto/q_auto.
 */
const MAX_EDGE: Record<UploadPurpose, number> = {
  products: 2000,
  users: 512,
  reviews: 1600,
  returns: 1600,
  categories: 1200,
  banners: 2400,
  expenses: 1800,
};

export function assertValidImage(file: File): void {
  if (!isAcceptedImageFile(file)) {
    throw new AppError('Only JPG, PNG, WebP, AVIF or HEIC images are allowed.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new AppError(`Each image must be under ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);
  }
}

export type UploadedMediaMeta = {
  asset: ImageAsset;
  filename: string;
  mimeType: string;
  format?: string;
  bytes: number;
  sha256: string;
};

function sanitizeFileBase(raw: string): string {
  const cleaned = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)
    .replace(/_+$/g, '');
  return cleaned || 'image';
}

function buildUniquePublicId(file: File, nameHint?: string): string {
  const trimmedHint = nameHint?.trim();
  const rawBase = trimmedHint || (file.name ? file.name.replace(/\.[^/.]+$/, '') : '');
  const base = sanitizeFileBase(rawBase);
  const uniqueId = crypto.randomBytes(4).toString('hex');
  return `${base}_${uniqueId}`;
}

export async function uploadImageWithMeta(
  file: File,
  purpose: UploadPurpose,
  nameHint?: string,
): Promise<UploadedMediaMeta> {
  assertValidImage(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const edge = MAX_EDGE[purpose];
  const publicIdBase = buildUniquePublicId(file, nameHint);

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: UPLOAD_FOLDERS[purpose],
        public_id: publicIdBase,
        unique_filename: false,
        overwrite: false,
        resource_type: 'image',
        format: 'webp',
        transformation: [{ width: edge, height: edge, crop: 'limit', quality: 'auto:good' }],
      },
      (error, res) => (error || !res ? reject(error ?? new Error('Upload failed')) : resolve(res)),
    );
    stream.end(buffer);
  });

  const resolvedBase = result.public_id.split('/').pop() || publicIdBase;
  const ext = result.format || file.name.split('.').pop()?.toLowerCase() || '';

  return {
    asset: {
      type: 'cloudinary',
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    },
    filename: ext ? `${resolvedBase}.${ext}` : resolvedBase,
    mimeType: result.format ? `image/${result.format}` : file.type,
    format: result.format,
    bytes: result.bytes ?? buffer.length,
    sha256,
  };
}

export async function uploadImage(file: File, purpose: UploadPurpose): Promise<ImageAsset> {
  const { asset } = await uploadImageWithMeta(file, purpose);
  return asset;
}

export async function uploadImages(files: File[], purpose: UploadPurpose): Promise<ImageAsset[]> {
  files.forEach(assertValidImage);
  return Promise.all(files.map((f) => uploadImage(f, purpose)));
}

/** Best-effort delete; never fails the caller (an orphaned asset is harmless). */
export async function deleteImages(images: (ImageAsset | undefined | null)[]): Promise<void> {
  const ids = images
    .filter((i): i is ImageAsset => !!i && i.type === 'cloudinary' && !!i.publicId)
    .map((i) => i.publicId!);
  if (ids.length === 0) return;
  try {
    await cloudinary.api.delete_resources(ids);
  } catch (error) {
    console.error('[cloudinary] delete failed', error);
  }
}

/** Strict delete for Media Library: throws if Cloudinary refuses or fails. */
export async function destroyCloudinaryResource(publicId: string): Promise<void> {
  const res = (await cloudinary.uploader.destroy(publicId, {
    resource_type: 'image',
    invalidate: true,
  })) as { result?: string };
  if (res?.result !== 'ok' && res?.result !== 'not found') {
    throw new AppError('Failed to delete media from Cloudinary storage.');
  }
}

export async function listCloudinaryResourcesByPrefix(prefix: string) {
  const res = (await cloudinary.api.resources({
    type: 'upload',
    prefix,
    max_results: 100,
    resource_type: 'image',
  })) as {
    resources?: {
      public_id: string;
      secure_url: string;
      format?: string;
      bytes?: number;
      width?: number;
      height?: number;
      created_at?: string;
    }[];
  };
  return res.resources ?? [];
}

/**
 * Only accept Cloudinary assets that live in our own cloud and in the folder
 * for this purpose — stops a client from attaching arbitrary publicIds.
 */
export function isOwnCloudinaryAsset(image: ImageAsset, purpose: UploadPurpose): boolean {
  if (image.type !== 'cloudinary') return true;
  const host = `res.cloudinary.com/${serverEnv.CLOUDINARY_CLOUD_NAME}/`;
  return (
    image.url.startsWith(`https://${host}`) &&
    !!image.publicId &&
    image.publicId.startsWith(`${UPLOAD_FOLDERS[purpose]}/`)
  );
}
