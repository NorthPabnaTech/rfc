import mongoose, { type Model, Schema } from 'mongoose';

import { IMAGE_SOURCE_TYPES, type ImageSourceType } from '@lib/constants';

/**
 * Registers a model once per process. In development a hot reload re-runs the
 * model file with a new schema object; the cached model would keep the old
 * schema and silently drop any newly added field on save, so it's recompiled.
 */
export function defineModel<T>(name: string, schema: Schema<T>): Model<T> {
  const existing = mongoose.models[name] as Model<T> | undefined;
  if (existing && (process.env.NODE_ENV === 'production' || existing.schema === schema)) {
    return existing;
  }
  if (existing) mongoose.deleteModel(name);
  return mongoose.model<T>(name, schema);
}

/**
 * An image that is either uploaded to Cloudinary (we own it: `publicId` lets
 * us transform and delete it) or an external URL, typically the supplier's
 * own product photo. Both kinds can be mixed freely in one list.
 */
export interface ImageAsset {
  type: ImageSourceType;
  url: string;
  /** Cloudinary public id — present only for `type: 'cloudinary'`. */
  publicId?: string;
  alt?: string;
  width?: number;
  height?: number;
}

export const imageAssetSchema = new Schema<ImageAsset>(
  {
    type: { type: String, enum: IMAGE_SOURCE_TYPES, required: true },
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true },
    alt: { type: String, trim: true, maxlength: 200 },
    width: Number,
    height: Number,
  },
  { _id: false },
);

/** Keep every model's JSON free of `__v` and with a string `id`. */
export const baseSchemaOptions = {
  timestamps: true,
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
} as const;
