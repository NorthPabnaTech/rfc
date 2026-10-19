import { type Model, Schema, type Types } from 'mongoose';

import { SUPPLIER_STATUSES, type SupplierStatus } from '@lib/constants';

import { baseSchemaOptions, defineModel } from './shared';

export interface Supplier {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  websiteUrl: string;
  status: SupplierStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<Supplier>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    websiteUrl: { type: String, required: true, trim: true, maxlength: 300 },
    status: { type: String, enum: SUPPLIER_STATUSES, default: 'active' },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  baseSchemaOptions,
);

supplierSchema.index({ slug: 1 }, { unique: true });

export const SupplierModel: Model<Supplier> = defineModel<Supplier>('Supplier', supplierSchema);
