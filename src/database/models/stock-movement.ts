import { type Model, Schema, type Types } from 'mongoose';

import {
  DEFAULT_BUSINESS_SLUG,
  STOCK_MOVEMENT_TYPES,
  type StockMovementType,
} from '@lib/constants';

import { baseSchemaOptions, defineModel } from './shared';

export interface StockMovement {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  productName: string;
  business: string;
  type: StockMovementType;
  /** Positive magnitude of the change. */
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  notes?: string;
  orderId?: Types.ObjectId | null;
  orderNumber?: string;
  date: Date;
  performedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const stockMovementSchema = new Schema<StockMovement>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productName: { type: String, required: true, trim: true, maxlength: 200 },
    business: { type: String, default: DEFAULT_BUSINESS_SLUG, index: true },
    type: { type: String, enum: STOCK_MOVEMENT_TYPES, required: true, index: true },
    quantity: { type: Number, required: true, min: 1 },
    previousQuantity: { type: Number, required: true, min: 0 },
    newQuantity: { type: Number, required: true, min: 0 },
    reason: { type: String, trim: true, maxlength: 120 },
    notes: { type: String, trim: true, maxlength: 1000 },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
    orderNumber: { type: String, trim: true, maxlength: 40 },
    date: { type: Date, default: Date.now, index: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  baseSchemaOptions,
);

stockMovementSchema.index({ product: 1, date: -1 });
stockMovementSchema.index({ business: 1, date: -1 });

export const StockMovementModel: Model<StockMovement> = defineModel<StockMovement>(
  'StockMovement',
  stockMovementSchema,
);
