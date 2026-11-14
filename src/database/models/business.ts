import { type Model, Schema, type Types } from 'mongoose';

import { baseSchemaOptions, defineModel, type ImageAsset, imageAssetSchema } from './shared';

export interface Business {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  invoicePrefix: string;
  phone?: string;
  address?: string;
  logo?: ImageAsset;
  /** Only true for the public-facing RFC Gadget storefront. */
  isPublicStorefront: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const businessSchema = new Schema<Business>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 500 },
    invoicePrefix: { type: String, required: true, trim: true, uppercase: true, maxlength: 10 },
    phone: { type: String, trim: true, maxlength: 30 },
    address: { type: String, trim: true, maxlength: 300 },
    logo: imageAssetSchema,
    isPublicStorefront: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
  },
  baseSchemaOptions,
);

businessSchema.index({ slug: 1 }, { unique: true });

export const BusinessModel: Model<Business> = defineModel<Business>('Business', businessSchema);
