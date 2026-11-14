import 'server-only';

import crypto from 'node:crypto';

import type { QueryFilter } from 'mongoose';

import {
  BannerModel,
  CategoryModel,
  connectDB,
  ExpenseModel,
  type ImageAsset,
  type MediaAsset,
  MediaAssetModel,
  ProductModel,
  ReturnRequestModel,
  ReviewModel,
  UserModel,
} from '@/database';
import type { MediaAssetDTO, MediaReferenceDTO, Paginated } from '@/types';
import {
  assertValidImage,
  destroyCloudinaryResource,
  listCloudinaryResourcesByPrefix,
  uploadImageWithMeta,
} from '@lib/cloudinary';
import { UPLOAD_FOLDERS, type UploadPurpose } from '@lib/constants';
import { AppError } from '@lib/errors';
import { dayjs } from '@lib/utils';

const MEDIA_PAGE_SIZE = 24;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toMediaDTO(
  m: MediaAsset & { uploadedBy?: { _id: unknown; name?: string } | null },
): MediaAssetDTO {
  return {
    id: String(m._id),
    filename: m.filename,
    url: m.url,
    publicId: m.publicId,
    mimeType: m.mimeType,
    format: m.format,
    bytes: m.bytes,
    width: m.width,
    height: m.height,
    purpose: m.purpose,
    uploadedByName:
      m.uploadedBy && typeof m.uploadedBy === 'object' && 'name' in m.uploadedBy
        ? m.uploadedBy.name
        : undefined,
    createdAt: new Date(m.createdAt).toISOString(),
  };
}

/**
 * Centralized upload handler: validates, deduplicates identical files per
 * purpose via SHA-256, uploads to Cloudinary, and records metadata in MongoDB.
 */
export async function uploadAndRecordMedia(
  files: File[],
  purpose: UploadPurpose,
  uploadedBy: string,
): Promise<ImageAsset[]> {
  await connectDB();
  files.forEach(assertValidImage);

  const results: ImageAsset[] = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    const existing = await MediaAssetModel.findOne({ sha256, purpose }).lean();
    if (existing) {
      results.push({
        type: 'cloudinary',
        url: existing.url,
        publicId: existing.publicId,
        width: existing.width,
        height: existing.height,
      });
      continue;
    }

    const uploaded = await uploadImageWithMeta(file, purpose);
    await MediaAssetModel.updateOne(
      { publicId: uploaded.asset.publicId! },
      {
        $setOnInsert: {
          filename: uploaded.filename,
          url: uploaded.asset.url,
          publicId: uploaded.asset.publicId!,
          mimeType: uploaded.mimeType,
          format: uploaded.format,
          bytes: uploaded.bytes,
          width: uploaded.asset.width,
          height: uploaded.asset.height,
          purpose,
          sha256: uploaded.sha256,
          uploadedBy,
        },
      },
      { upsert: true },
    );
    results.push(uploaded.asset);
  }
  return results;
}

export type MediaFilters = {
  q?: string;
  purpose?: UploadPurpose;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export async function listMediaAssets(f: MediaFilters): Promise<Paginated<MediaAssetDTO>> {
  await connectDB();
  const page = Math.max(1, f.page ?? 1);
  const pageSize = f.pageSize ?? MEDIA_PAGE_SIZE;
  const query: QueryFilter<MediaAsset> = {};

  if (f.q) {
    const rx = new RegExp(escapeRegex(f.q.trim().slice(0, 80)), 'i');
    query.$or = [{ filename: rx }, { publicId: rx }];
  }
  if (f.purpose) query.purpose = f.purpose;
  if (f.from || f.to) {
    query.createdAt = {
      ...(f.from ? { $gte: dayjs.tz(f.from, 'Asia/Dhaka').startOf('day').toDate() } : {}),
      ...(f.to ? { $lte: dayjs.tz(f.to, 'Asia/Dhaka').endOf('day').toDate() } : {}),
    };
  }

  const [docs, total] = await Promise.all([
    MediaAssetModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('uploadedBy', 'name')
      .lean(),
    MediaAssetModel.countDocuments(query),
  ]);

  return {
    items: docs.map((d) => toMediaDTO(d as never)),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Checks whether a media asset is currently referenced by any product, category,
 * banner, expense, user avatar, review, or return request.
 */
export async function findMediaReferences(id: string): Promise<MediaReferenceDTO[]> {
  await connectDB();
  const asset = await MediaAssetModel.findById(id).lean();
  if (!asset) throw new AppError('Media file not found.', 404);

  const match = { $or: [{ publicId: asset.publicId }, { url: asset.url }] };
  const [products, categories, banners, expenses, users, reviews, returns] = await Promise.all([
    ProductModel.find(
      { $or: [{ 'images.publicId': asset.publicId }, { 'images.url': asset.url }] },
      'name',
    )
      .limit(10)
      .lean(),
    CategoryModel.find(
      { $or: [{ 'image.publicId': asset.publicId }, { 'image.url': asset.url }] },
      'name',
    )
      .limit(10)
      .lean(),
    BannerModel.find(
      { $or: [{ 'image.publicId': asset.publicId }, { 'image.url': asset.url }] },
      'title',
    )
      .limit(10)
      .lean(),
    ExpenseModel.find(
      { $or: [{ 'attachment.publicId': asset.publicId }, { 'attachment.url': asset.url }] },
      'title',
    )
      .limit(10)
      .lean(),
    UserModel.find(
      { $or: [{ 'avatar.publicId': asset.publicId }, { 'avatar.url': asset.url }] },
      'name',
    )
      .limit(10)
      .lean(),
    ReviewModel.find({ images: { $elemMatch: match } }, '_id').limit(5).lean(),
    ReturnRequestModel.find({ images: { $elemMatch: match } }, 'orderNumber')
      .limit(5)
      .lean(),
  ]);

  const refs: MediaReferenceDTO[] = [];
  products.forEach((p) => refs.push({ kind: 'Product', id: String(p._id), label: p.name }));
  categories.forEach((c) => refs.push({ kind: 'Category', id: String(c._id), label: c.name }));
  banners.forEach((b) => refs.push({ kind: 'Banner', id: String(b._id), label: b.title }));
  expenses.forEach((e) => refs.push({ kind: 'Expense', id: String(e._id), label: e.title }));
  users.forEach((u) => refs.push({ kind: 'User', id: String(u._id), label: u.name }));
  reviews.forEach((r) => refs.push({ kind: 'Review', id: String(r._id), label: 'Customer review' }));
  returns.forEach((r) =>
    refs.push({ kind: 'Return', id: String(r._id), label: `Return ${r.orderNumber}` }),
  );
  return refs;
}

export async function deleteMediaAsset(id: string): Promise<void> {
  await connectDB();
  const asset = await MediaAssetModel.findById(id).lean();
  if (!asset) throw new AppError('Media file not found.', 404);

  const refs = await findMediaReferences(id);
  if (refs.length > 0) {
    const sample = refs
      .slice(0, 3)
      .map((r) => `${r.kind}: ${r.label}`)
      .join(', ');
    throw new AppError(
      `Cannot delete "${asset.filename}" because it is used by ${refs.length} item(s) (${sample}). Remove it from those items first.`,
    );
  }

  // Delete from Cloudinary storage first; only remove DB record if storage deletion succeeds.
  await destroyCloudinaryResource(asset.publicId);
  await MediaAssetModel.deleteOne({ _id: id });
}

/** Imports any pre-existing Cloudinary files under RFC-Gadget folders into MediaAssetModel. */
export async function syncCloudinaryMedia(uploadedBy: string): Promise<number> {
  await connectDB();
  let imported = 0;
  const purposes = Object.keys(UPLOAD_FOLDERS) as UploadPurpose[];
  for (const purpose of purposes) {
    const folder = UPLOAD_FOLDERS[purpose];
    const resources = await listCloudinaryResourcesByPrefix(folder);
    for (const r of resources) {
      const name = r.public_id.split('/').pop() || r.public_id;
      const res = await MediaAssetModel.updateOne(
        { publicId: r.public_id },
        {
          $setOnInsert: {
            filename: r.format ? `${name}.${r.format}` : name,
            url: r.secure_url,
            publicId: r.public_id,
            mimeType: r.format ? `image/${r.format}` : 'image/jpeg',
            format: r.format,
            bytes: r.bytes ?? 0,
            width: r.width,
            height: r.height,
            purpose,
            uploadedBy,
            ...(r.created_at ? { createdAt: new Date(r.created_at) } : {}),
          },
        },
        { upsert: true },
      );
      if (res.upsertedCount > 0) imported += 1;
    }
  }
  return imported;
}
