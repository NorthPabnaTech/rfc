import { type Model, Schema, type Types } from 'mongoose';

import { DEFAULT_BUSINESS_SLUG } from '@lib/constants';

import { baseSchemaOptions, defineModel, type ImageAsset, imageAssetSchema } from './shared';

/**
 * Categories form a two-level tree: a category with `parent: null` is a
 * top-level category; one with a `parent` is a sub-category of it.
 */
export interface Category {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  business: string;
  parent: Types.ObjectId | null;
  image?: ImageAsset;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<Category>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true, maxlength: 500 },
    business: { type: String, default: DEFAULT_BUSINESS_SLUG, index: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    image: imageAssetSchema,
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);

categorySchema.index({ business: 1, slug: 1 }, { unique: true });

export const CategoryModel: Model<Category> = defineModel<Category>('Category', categorySchema);
