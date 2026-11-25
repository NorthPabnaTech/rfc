import { type Model, Schema, type Types } from 'mongoose';

import {
  WALLET_TX_STATUSES,
  WALLET_TX_TYPES,
  type WalletTxStatus,
  type WalletTxType,
} from '@lib/constants';

import { baseSchemaOptions, defineModel } from './shared';

export interface WalletTransaction {
  _id: Types.ObjectId;
  txNumber: string;
  reseller: Types.ObjectId;
  type: WalletTxType;
  direction: 'credit' | 'debit';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: WalletTxStatus;

  order?: Types.ObjectId | null;
  orderNumber?: string;
  paymentMethod?: string;
  paymentReference?: string;
  gatewayTransactionId?: string;
  /** Paymently invoice that funded this deposit — unique, so it credits once. */
  invoiceId?: string;
  /** Withdrawals: fee kept by the platform, and what is actually paid out. */
  fee?: number;
  netAmount?: number;
  payoutMethod?: string;
  payoutAccount?: string;
  note?: string;
  processedBy?: Types.ObjectId | null;
  processedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const walletTransactionSchema = new Schema<WalletTransaction>(
  {
    txNumber: { type: String, required: true, trim: true },
    reseller: { type: Schema.Types.ObjectId, ref: 'Reseller', required: true, index: true },
    type: { type: String, enum: WALLET_TX_TYPES, required: true, index: true },
    direction: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true, min: 0 },
    balanceBefore: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true, min: 0 },
    status: { type: String, enum: WALLET_TX_STATUSES, default: 'completed', index: true },

    order: { type: Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
    orderNumber: { type: String, trim: true },
    paymentMethod: { type: String, trim: true, maxlength: 40 },
    paymentReference: { type: String, trim: true, maxlength: 120 },
    gatewayTransactionId: { type: String, trim: true, maxlength: 120 },
    invoiceId: { type: String, trim: true, maxlength: 120 },
    fee: { type: Number, min: 0 },
    netAmount: { type: Number, min: 0 },
    payoutMethod: { type: String, trim: true, maxlength: 40 },
    payoutAccount: { type: String, trim: true, maxlength: 200 },
    note: { type: String, trim: true, maxlength: 500 },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    processedAt: Date,
  },
  baseSchemaOptions,
);

walletTransactionSchema.index({ txNumber: 1 }, { unique: true });
walletTransactionSchema.index({ reseller: 1, createdAt: -1 });
walletTransactionSchema.index({ paymentReference: 1 }, { sparse: true });
// Idempotency: a gateway invoice / transaction funds at most one deposit…
walletTransactionSchema.index(
  { invoiceId: 1 },
  { unique: true, partialFilterExpression: { invoiceId: { $type: 'string' } } },
);
walletTransactionSchema.index(
  { gatewayTransactionId: 1 },
  { unique: true, partialFilterExpression: { gatewayTransactionId: { $type: 'string' } } },
);
// …and an order is charged, credited with profit and refunded at most once.
for (const type of ['order_deduction', 'order_profit', 'order_refund'] as const) {
  walletTransactionSchema.index(
    { order: 1, type: 1 },
    {
      unique: true,
      name: `order_1_${type}_unique`,
      partialFilterExpression: { type, order: { $type: 'objectId' } },
    },
  );
}

export const WalletTransactionModel: Model<WalletTransaction> = defineModel<WalletTransaction>(
  'WalletTransaction',
  walletTransactionSchema,
);
