import 'server-only';

import mongoose, { type InferSchemaType, type Model, Schema } from 'mongoose';

/*
 * Reseller platform data model (MongoDB database `gadget_resell`).
 *
 * Shapes mirror the DTOs in `src/types/platform.ts`; `server/mappers.ts`
 * converts documents to those DTOs. Model names are prefixed (`Rs…`) so they
 * never collide with the legacy RFC Gadget models in `src/database`.
 *
 * Money is whole Taka (Number). The seller wallet balance is kept on the
 * user document (`wallet.available`) and changed only with conditional
 * atomic updates inside a transaction, alongside a ledger entry in
 * `transactions` — so a balance can never go negative or be charged twice.
 */

const opts = { timestamps: true, versionKey: false } as const;

/** Registers a model once (survives dev hot reloads) with a typed document shape. */
function rsModel<S extends Schema>(name: string, schema: S, collection: string) {
  type Doc = InferSchemaType<S>;
  const existing = mongoose.models[name] as Model<Doc> | undefined;
  if (existing && (process.env.NODE_ENV === 'production' || existing.schema === schema)) return existing;
  if (existing) mongoose.deleteModel(name);
  return mongoose.model<Doc>(name, schema as unknown as Schema<Doc>, collection);
}

/* ─── Users (admins + sellers) ───────────────────────────────────────── */

const userSchema = new Schema(
  {
    role: { type: String, enum: ['admin', 'seller'], required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    passwordHash: { type: String, required: true, select: false },
    status: {
      type: String,
      enum: ['active', 'pending', 'inactive', 'suspended'],
      default: 'pending',
      index: true,
    },
    emailVerified: { type: Boolean, default: false },
    verifyCodeHash: { type: String, select: false },
    verifyCodeExpires: { type: Date, select: false },
    resetTokenHash: { type: String, select: false, index: true, sparse: true },
    resetExpires: { type: Date, select: false },
    // Seller profile
    shopName: { type: String, default: '' },
    district: { type: String, default: '' },
    address: { type: String, default: '' },
    avatarColor: { type: String, default: '#219ebc' },
    payout: {
      method: { type: String, enum: ['bkash', 'nagad', 'rocket', 'bank'], default: 'bkash' },
      account: { type: String, default: '' },
    },
    wallet: { available: { type: Number, default: 0, min: 0 } },
  },
  opts,
);
export const UserModel = rsModel('RsUser', userSchema, 'users');

/* ─── Catalog ────────────────────────────────────────────────────────── */

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nameBn: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    icon: { type: String, default: 'box' },
    description: { type: String, default: '' },
    sort: { type: Number, default: 0 },
  },
  opts,
);
export const CategoryModel = rsModel('RsCategory', categorySchema, 'categories');

const supplierSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    sourceUrl: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    notes: { type: String, default: '' },
  },
  opts,
);
export const SupplierModel = rsModel('RsSupplier', supplierSchema, 'suppliers');

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nameBn: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    images: { type: [String], default: [] },
    categoryId: { type: Schema.Types.ObjectId, ref: 'RsCategory', required: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'RsSupplier', required: true, index: true },
    supplierCost: { type: Number, required: true, min: 0 },
    platformMargin: { type: Number, required: true, min: 0 },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    packagingCharge: { type: Number, default: 0, min: 0 },
    suggestedPrice: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['active', 'draft', 'out_of_stock'], default: 'active', index: true },
    availability: { type: String, enum: ['in_stock', 'limited', 'out_of_stock'], default: 'in_stock' },
  },
  opts,
);
export const ProductModel = rsModel('RsProduct', productSchema, 'products');

/* ─── Orders ─────────────────────────────────────────────────────────── */

const ORDER_STATUSES = [
  'placed',
  'processing',
  'confirmed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
];

const orderSchema = new Schema(
  {
    orderNo: { type: String, required: true, unique: true },
    invoiceNo: { type: String, required: true, unique: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'RsUser', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'RsProduct', required: true, index: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    // Price snapshot at order time (never recomputed from the live product).
    basePrice: { type: Number, required: true },
    supplierCost: { type: Number, required: true },
    platformMargin: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    deliveryCharge: { type: Number, required: true },
    packagingCharge: { type: Number, required: true },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      altPhone: { type: String },
      address: { type: String, required: true },
      district: { type: String, required: true },
      upazila: { type: String, required: true },
      area: { type: String, enum: ['inside_dhaka', 'sub_dhaka', 'outside_dhaka'], required: true },
    },
    status: { type: String, enum: ORDER_STATUSES, default: 'placed', index: true },
    history: [
      {
        _id: false,
        status: { type: String, enum: ORDER_STATUSES, required: true },
        at: { type: Date, required: true },
        note: { type: String },
      },
    ],
    trackingCode: { type: String },
    courier: { type: String },
    note: { type: String },
    deliveredAt: { type: Date },
  },
  opts,
);
orderSchema.index({ createdAt: -1 });
export const OrderModel = rsModel('RsOrder', orderSchema, 'orders');

/* ─── Wallet ledger ──────────────────────────────────────────────────── */

const transactionSchema = new Schema(
  {
    txNo: { type: String, required: true, unique: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'RsUser', required: true, index: true },
    type: {
      type: String,
      enum: [
        'add_balance',
        'delivery_charge',
        'packaging_charge',
        'seller_earning',
        'withdrawal',
        'withdrawal_fee',
        'refund',
      ],
      required: true,
    },
    amount: { type: Number, required: true }, // signed
    status: { type: String, enum: ['completed', 'pending', 'failed'], default: 'completed' },
    description: { type: String, default: '' },
    orderId: { type: Schema.Types.ObjectId, ref: 'RsOrder' },
    orderNo: { type: String },
    withdrawalId: { type: Schema.Types.ObjectId, ref: 'RsWithdrawal', index: true, sparse: true },
    depositId: { type: Schema.Types.ObjectId, ref: 'RsDeposit' },
  },
  opts,
);
transactionSchema.index({ createdAt: -1 });
export const TransactionModel = rsModel('RsTransaction', transactionSchema, 'transactions');

const earningSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'RsUser', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'RsOrder', required: true, unique: true },
    orderNo: { type: String, required: true },
    amount: { type: Number, required: true },
    deliveredAt: { type: Date, required: true },
    releaseAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ['pending', 'released'], default: 'pending', index: true },
  },
  opts,
);
export const EarningModel = rsModel('RsEarning', earningSchema, 'earnings');

const withdrawalSchema = new Schema(
  {
    withdrawalNo: { type: String, required: true, unique: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'RsUser', required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    fee: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['bkash', 'nagad', 'rocket', 'bank'], required: true },
    account: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending',
      index: true,
    },
    processedAt: { type: Date },
    note: { type: String },
  },
  opts,
);
export const WithdrawalModel = rsModel('RsWithdrawal', withdrawalSchema, 'withdrawals');

const depositSchema = new Schema(
  {
    depositNo: { type: String, required: true, unique: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'RsUser', required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    method: { type: String, enum: ['bkash', 'nagad', 'rocket', 'bank'], required: true },
    reference: { type: String, required: true },
    senderNumber: { type: String },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending', index: true },
    /** True when an admin credited the wallet directly. */
    manual: { type: Boolean, default: false },
  },
  opts,
);
export const DepositModel = rsModel('RsDeposit', depositSchema, 'deposits');

/* ─── Platform ───────────────────────────────────────────────────────── */

const expenseSchema = new Schema(
  {
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ['courier', 'packaging', 'marketing', 'salary', 'software', 'office', 'other'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, index: true },
    note: { type: String },
  },
  opts,
);
export const ExpenseModel = rsModel('RsExpense', expenseSchema, 'expenses');

const notificationSchema = new Schema(
  {
    audience: { type: String, enum: ['admin', 'seller'], required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'RsUser', index: true },
    kind: {
      type: String,
      enum: ['order', 'status', 'payment', 'withdrawal', 'earning', 'account'],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    href: { type: String },
    read: { type: Boolean, default: false },
  },
  opts,
);
notificationSchema.index({ createdAt: -1 });
export const NotificationModel = rsModel('RsNotification', notificationSchema, 'notifications');

const ticketSchema = new Schema(
  {
    ticketNo: { type: String, required: true, unique: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'RsUser', required: true, index: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
    status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
  },
  opts,
);
export const TicketModel = rsModel('RsTicket', ticketSchema, 'tickets');

/** Singleton document (`_id: 'platform'`). */
const settingsSchema = new Schema(
  {
    _id: { type: String, default: 'platform' },
    platformName: String,
    contactEmail: String,
    supportPhone: String,
    currency: String,
    timezone: String,
    defaultMargin: Number,
    defaultPackagingCharge: Number,
    deliveryCharges: { inside_dhaka: Number, sub_dhaka: Number, outside_dhaka: Number },
    minAddBalance: Number,
    minWithdrawal: Number,
    withdrawalFees: { threshold: Number, lowFee: Number, highFee: Number, atThresholdFee: Number },
    earningsReleaseHours: Number,
    telegramSupport: String,
    telegramGroup: String,
  },
  opts,
);
export const SettingsModel = rsModel('RsSettings', settingsSchema, 'settings');
