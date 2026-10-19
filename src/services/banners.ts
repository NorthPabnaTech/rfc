import 'server-only';

import { cache } from 'react';

import { BannerModel, connectDB } from '@/database';
import type { BannerDTO } from '@/types';
import { deleteImages, isOwnCloudinaryAsset } from '@lib/cloudinary';
import type { BannerPosition } from '@lib/constants';
import { AppError } from '@lib/errors';
import type { BannerOutput } from '@lib/validators/banner';

import { toBanner } from './mappers';

/**
 * Active banners for the storefront, grouped by position. A banner shows
 * while `isActive` and inside its optional [startsAt, endsAt] window.
 */
export const getActiveBanners = cache(async (): Promise<Record<BannerPosition, BannerDTO[]>> => {
  await connectDB();
  const now = new Date();
  const docs = await BannerModel.find({
    isActive: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  })
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();
  const grouped: Record<BannerPosition, BannerDTO[]> = {
    hero: [],
    hero_side: [],
    special: [],
    combo: [],
  };
  for (const d of docs) grouped[d.position]?.push(toBanner(d));
  return grouped;
});

export async function listAdminBanners(): Promise<BannerDTO[]> {
  await connectDB();
  const docs = await BannerModel.find().sort({ position: 1, sortOrder: 1, createdAt: -1 }).lean();
  return docs.map(toBanner);
}

export async function saveBanner(input: BannerOutput, id?: string): Promise<void> {
  await connectDB();
  if (!isOwnCloudinaryAsset(input.image, 'banners')) {
    throw new AppError('The banner image is not valid. Please re-upload it.');
  }
  if (input.startsAt && input.endsAt && input.endsAt < input.startsAt) {
    throw new AppError('The end date must be after the start date.');
  }
  if (id) {
    const doc = await BannerModel.findById(id);
    if (!doc) throw new AppError('Banner not found.', 404);
    const old = doc.image;
    doc.set(input);
    await doc.save();
    if (old?.publicId && old.publicId !== input.image.publicId) await deleteImages([old]);
    return;
  }
  await BannerModel.create(input);
}

export async function setBannerActive(id: string, isActive: boolean): Promise<void> {
  await connectDB();
  const res = await BannerModel.updateOne({ _id: id }, { $set: { isActive } });
  if (!res.matchedCount) throw new AppError('Banner not found.', 404);
}

export async function deleteBanner(id: string): Promise<void> {
  await connectDB();
  const doc = await BannerModel.findByIdAndDelete(id).lean();
  if (doc) await deleteImages([doc.image]);
}
