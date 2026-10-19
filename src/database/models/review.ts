import { type Model, Schema, type Types } from 'mongoose';

import { baseSchemaOptions, defineModel, type ImageAsset, imageAssetSchema } from './shared';

export interface Review {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  user: Types.ObjectId;
  /** The delivered order that proves the purchase. */
  order: Types.ObjectId;
  rating: number;
  comment: string;
  images: ImageAsset[];
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<Review>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 2000 },
    images: { type: [imageAssetSchema], default: [] },
    isHidden: { type: Boolean, default: false, index: true },
  },
  baseSchemaOptions,
);

// One review per customer per product.
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

export const ReviewModel: Model<Review> = defineModel<Review>('Review', reviewSchema);
