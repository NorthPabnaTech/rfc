import 'server-only';

import { type UploadApiResponse, v2 as cloudinary } from 'cloudinary';

import type { ImageAsset } from '@/database';
import {
  ACCEPTED_IMAGE_TYPES,
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
};

export function assertValidImage(file: File): void {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new AppError('Only JPG, PNG, WebP or AVIF images are allowed.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new AppError(`Each image must be under ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);
  }
}

export async function uploadImage(file: File, purpose: UploadPurpose): Promise<ImageAsset> {
  assertValidImage(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const edge = MAX_EDGE[purpose];

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: UPLOAD_FOLDERS[purpose],
        resource_type: 'image',
        transformation: [{ width: edge, height: edge, crop: 'limit', quality: 'auto:good' }],
      },
      (error, res) => (error || !res ? reject(error ?? new Error('Upload failed')) : resolve(res)),
    );
    stream.end(buffer);
  });

  return {
    type: 'cloudinary',
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
  };
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
