import { type Model, Schema, type Types } from 'mongoose';

import {
  ORDER_PLATFORMS,
  ORDER_STATUSES,
  type OrderPlatform,
  type OrderStatus,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type PaymentMethod,
  type PaymentStatus,
} from '@lib/constants';

import { type AddressSnapshot, addressSnapshotSchema } from './address';
import { type OrderItem, orderItemSchema } from './order-item';
import { baseSchemaOptions, defineModel } from './shared';

export interface OrderStatusEvent {
  status: OrderStatus;
  note?: string;
  at: Date;
  /** Admin or customer who made the change; absent for system events. */
  by?: Types.ObjectId | null;
}

export interface Order {
  _id: Types.ObjectId;
  /** Human-friendly, sequential: NV-100001. */
  orderNumber: string;
  /** Null for guest checkouts and manual orders for unregistered customers. */
  user?: Types.ObjectId | null;
  customer: { name: string; phone: string; email?: string };
  shippingAddress: AddressSnapshot;
  items: OrderItem[];

  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  /** Sum of supplier cost across lines, for profit = total - shipping - cost. */
  supplierCost: number;

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  platform: OrderPlatform;
  status: OrderStatus;
  statusHistory: OrderStatusEvent[];

  customerNote?: string;
  adminNote?: string;
  cancelReason?: string;
  /** Admin who created a manual order. */
  createdBy?: Types.ObjectId | null;

  confirmedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const statusEventSchema = new Schema<OrderStatusEvent>(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    note: { type: String, trim: true, maxlength: 500 },
    at: { type: Date, default: Date.now },
    by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false },
);

const orderSchema = new Schema<Order>(
  {
    orderNumber: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    customer: {
      name: { type: String, required: true, trim: true, maxlength: 80 },
      phone: { type: String, required: true, trim: true, maxlength: 20 },
      email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    },
    shippingAddress: { type: addressSnapshotSchema, required: true },
    items: {
      type: [orderItemSchema],
      validate: [(v: unknown[]) => v.length > 0, 'An order needs at least one item'],
    },

    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0, default: 0 },
    discount: { type: Number, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    supplierCost: { type: Number, min: 0, default: 0 },

    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'cod' },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid' },
    platform: { type: String, enum: ORDER_PLATFORMS, default: 'website', index: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
    statusHistory: { type: [statusEventSchema], default: [] },

    customerNote: { type: String, trim: true, maxlength: 1000 },
    adminNote: { type: String, trim: true, maxlength: 2000 },
    cancelReason: { type: String, trim: true, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    confirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
  },
  baseSchemaOptions,
);

orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'customer.phone': 1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const OrderModel: Model<Order> = defineModel<Order>('Order', orderSchema);
