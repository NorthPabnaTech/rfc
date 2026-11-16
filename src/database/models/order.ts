import { type Model, Schema, type Types } from 'mongoose';

import {
  DEFAULT_BUSINESS_SLUG,
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

export interface ReturnedOrderItem {
  orderItemId: Types.ObjectId;
  product: Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number;
  supplierPrice: number;
  lineTotal: number;
  restocked: boolean;
}

export interface Order {
  _id: Types.ObjectId;
  /** Human-friendly, sequential: RFC-100001. */
  orderNumber: string;
  invoiceNumber?: string;
  business: string;
  /** Null for guest checkouts and manual orders for unregistered customers. */
  user?: Types.ObjectId | null;
  customer: { name: string; phone: string; email?: string };
  shippingAddress: AddressSnapshot;
  items: OrderItem[];

  subtotal: number;
  shippingFee: number;
  discount: number;
  couponCode?: string | null;
  campaignId?: Types.ObjectId | null;
  total: number;
  /** Sum of supplier cost across lines, for profit = total - shipping - cost. */
  supplierCost: number;

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentGateway?: string | null;
  paymentReference?: string | null;
  gatewayTransactionId?: string | null;
  gatewayPaymentMethod?: string | null;
  paidAt?: Date | null;
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
  returnedAt?: Date;
  stockDeducted: boolean;
  stockRestored: boolean;
  refundedAmount: number;
  returnedItems: ReturnedOrderItem[];
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

const returnedItemSchema = new Schema<ReturnedOrderItem>(
  {
    orderItemId: { type: Schema.Types.ObjectId, required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    supplierPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    restocked: { type: Boolean, default: false },
  },
  { _id: false },
);

const orderSchema = new Schema<Order>(
  {
    orderNumber: { type: String, required: true },
    invoiceNumber: { type: String, trim: true },
    business: { type: String, default: DEFAULT_BUSINESS_SLUG, index: true },
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
    couponCode: { type: String, trim: true, uppercase: true, default: null },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', default: null },
    total: { type: Number, required: true, min: 0 },
    supplierCost: { type: Number, min: 0, default: 0 },

    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'cod' },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid' },
    paymentGateway: { type: String, trim: true, default: null },
    paymentReference: { type: String, trim: true, default: null },
    gatewayTransactionId: { type: String, trim: true, default: null },
    gatewayPaymentMethod: { type: String, trim: true, default: null },
    paidAt: { type: Date, default: null },
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
    returnedAt: Date,
    stockDeducted: { type: Boolean, default: false },
    stockRestored: { type: Boolean, default: false },
    refundedAmount: { type: Number, min: 0, default: 0 },
    returnedItems: { type: [returnedItemSchema], default: [] },
  },
  baseSchemaOptions,
);

orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'customer.phone': 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentReference: 1 }, { sparse: true });
orderSchema.index({ gatewayTransactionId: 1 }, { sparse: true });

export const OrderModel: Model<Order> = defineModel<Order>('Order', orderSchema);
