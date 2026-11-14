import { type Model, Schema, type Types } from 'mongoose';

import {
  SUPPLIER_ORDER_STATUSES,
  SUPPLIER_PROVIDERS,
  type SupplierOrderStatus,
  type SupplierProvider,
} from '@lib/constants';

import { baseSchemaOptions, defineModel } from './shared';

export interface SupplierOrderEvent {
  status: SupplierOrderStatus;
  note?: string;
  at: Date;
  by?: Types.ObjectId | null;
}

export interface SupplierOrder {
  _id: Types.ObjectId;
  order: Types.ObjectId;
  orderNumber: string;
  orderItemId: Types.ObjectId;
  product: Types.ObjectId;
  productName: string;
  supplier: Types.ObjectId;
  supplierName: string;
  supplierProvider?: SupplierProvider;
  externalProductId: string;
  externalVariantId?: string;
  variantLabel?: string;
  quantity: number;

  customer: {
    name: string;
    phone: string;
    address: string;
    division: string;
    district: string;
    area: string;
  };
  customerNote?: string;

  sellingPrice: number;
  costPrice: number;
  packagingCost: number;
  deliveryCharge: number;
  deliveryChargePaidByCustomer: boolean;
  deliveryChargePaidUpfront: boolean;
  expectedProfit: number;

  status: SupplierOrderStatus;
  /** Lock flag to prevent concurrent duplicate submissions for the same record. */
  submitting?: boolean;
  externalOrderId?: string;
  externalStatus?: string;
  paymentStatus?: string;
  isDuplicate?: boolean;
  allowDuplicate?: boolean;

  confirmedBy?: Types.ObjectId | null;
  confirmedAt?: Date;
  submittedAt?: Date;
  lastSyncedAt?: Date;
  lastError?: string;
  lastResponseSummary?: Record<string, unknown>;
  statusHistory: SupplierOrderEvent[];

  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<SupplierOrderEvent>(
  {
    status: { type: String, enum: SUPPLIER_ORDER_STATUSES, required: true },
    note: { type: String, trim: true, maxlength: 1000 },
    at: { type: Date, default: Date.now },
    by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false },
);

const supplierOrderSchema = new Schema<SupplierOrder>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderNumber: { type: String, required: true, trim: true, index: true },
    orderItemId: { type: Schema.Types.ObjectId, required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true, trim: true },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    supplierName: { type: String, required: true, trim: true },
    supplierProvider: { type: String, enum: SUPPLIER_PROVIDERS },
    externalProductId: { type: String, required: true, trim: true },
    externalVariantId: { type: String, trim: true },
    variantLabel: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },

    customer: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      division: { type: String, required: true, trim: true },
      district: { type: String, required: true, trim: true },
      area: { type: String, required: true, trim: true },
    },
    customerNote: { type: String, trim: true, maxlength: 1000 },

    sellingPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    packagingCost: { type: Number, default: 0, min: 0 },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    deliveryChargePaidByCustomer: { type: Boolean, default: true },
    deliveryChargePaidUpfront: { type: Boolean, default: false },
    expectedProfit: { type: Number, default: 0 },

    status: {
      type: String,
      enum: SUPPLIER_ORDER_STATUSES,
      default: 'awaiting_confirmation',
      index: true,
    },
    submitting: { type: Boolean, default: false },
    externalOrderId: { type: String, trim: true, index: true, sparse: true },
    externalStatus: { type: String, trim: true },
    paymentStatus: { type: String, trim: true },
    isDuplicate: { type: Boolean, default: false },
    allowDuplicate: { type: Boolean, default: false },

    confirmedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    confirmedAt: Date,
    submittedAt: Date,
    lastSyncedAt: Date,
    lastError: { type: String, trim: true, maxlength: 2000 },
    lastResponseSummary: { type: Schema.Types.Mixed },
    statusHistory: { type: [eventSchema], default: [] },
  },
  baseSchemaOptions,
);

supplierOrderSchema.index({ order: 1, orderItemId: 1 }, { unique: true });

export const SupplierOrderModel: Model<SupplierOrder> = defineModel<SupplierOrder>(
  'SupplierOrder',
  supplierOrderSchema,
);
