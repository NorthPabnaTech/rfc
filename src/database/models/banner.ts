import { type Model, Schema, type Types } from 'mongoose';

import { BANNER_POSITIONS, type BannerPosition } from '@lib/constants';

import { baseSchemaOptions, defineModel, type ImageAsset, imageAssetSchema } from './shared';

/**
 * A promotional banner (Eid offer, winter sale, flash sale, new arrivals…).
 * Shown automatically in its `position` while active and inside its optional
 * schedule window.
 */
export interface Banner {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  image: ImageAsset;
  /** Small label above the title, e.g. "Limited time". */
  eyebrow?: string;
  ctaLabel?: string;
  link?: string;
  position: BannerPosition;
  isActive: boolean;
  sortOrder: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<Banner>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 300 },
    image: { type: imageAssetSchema, required: true },
    eyebrow: { type: String, trim: true, maxlength: 40 },
    ctaLabel: { type: String, trim: true, maxlength: 40 },
    link: { type: String, trim: true, maxlength: 500 },
    position: { type: String, enum: BANNER_POSITIONS, required: true, index: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
  },
  baseSchemaOptions,
);

bannerSchema.index({ position: 1, isActive: 1, sortOrder: 1 });

export const BannerModel: Model<Banner> = defineModel<Banner>('Banner', bannerSchema);
