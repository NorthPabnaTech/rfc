import { type Model, Schema, type Types } from 'mongoose';

import { RETURN_STATUSES, type ReturnStatus } from '@lib/constants';

import { baseSchemaOptions, defineModel, type ImageAsset, imageAssetSchema } from './shared';

export interface ReturnRequest {
  _id: Types.ObjectId;
  order: Types.ObjectId;
  orderNumber: string;
  user: Types.ObjectId;
  reason: string;
  description?: string;
  images: ImageAsset[];
  status: ReturnStatus;
  adminNote?: string;
  refundAmount?: number;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const returnRequestSchema = new Schema<ReturnRequest>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNumber: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reason: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000 },
    images: { type: [imageAssetSchema], default: [] },
    status: { type: String, enum: RETURN_STATUSES, default: 'pending', index: true },
    adminNote: { type: String, trim: true, maxlength: 2000 },
    refundAmount: { type: Number, min: 0 },
    resolvedAt: Date,
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  baseSchemaOptions,
);

// One return request per order.
returnRequestSchema.index({ order: 1 }, { unique: true });

export const ReturnRequestModel: Model<ReturnRequest> = defineModel<ReturnRequest>(
  'ReturnRequest',
  returnRequestSchema,
);
