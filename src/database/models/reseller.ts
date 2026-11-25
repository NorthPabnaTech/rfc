import { type HydratedDocument, type Model, Schema, type Types } from 'mongoose';

import { baseSchemaOptions, defineModel } from './shared';

export interface ResellerPayoutDetails {
  bkash?: string;
  nagad?: string;
  bankInfo?: string;
}

export interface Reseller {
  _id: Types.ObjectId;
  name: string;
  shopName: string;
  email: string;
  phone?: string;
  googleId?: string;
  avatarUrl?: string;
  address?: string;
  passwordHash?: string;
  isActive: boolean;

  walletBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalProfitEarned: number;
  totalSales: number;
  totalOrders: number;

  payoutDetails?: ResellerPayoutDetails;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
  /** Bumped on logout / suspension; tokens carrying an older version are rejected. */
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ResellerDocument = HydratedDocument<Reseller>;

const resellerSchema = new Schema<Reseller>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    shopName: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, trim: true, maxlength: 20 },
    googleId: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    address: { type: String, trim: true, maxlength: 300 },
    passwordHash: { type: String, select: false },
    isActive: { type: Boolean, default: true, index: true },

    walletBalance: { type: Number, default: 0, min: 0 },
    totalDeposited: { type: Number, default: 0, min: 0 },
    totalWithdrawn: { type: Number, default: 0, min: 0 },
    totalProfitEarned: { type: Number, default: 0, min: 0 },
    totalSales: { type: Number, default: 0, min: 0 },
    totalOrders: { type: Number, default: 0, min: 0 },

    payoutDetails: {
      bkash: { type: String, trim: true, maxlength: 20 },
      nagad: { type: String, trim: true, maxlength: 20 },
      bankInfo: { type: String, trim: true, maxlength: 300 },
    },
    lastLoginAt: Date,
    passwordChangedAt: Date,
    tokenVersion: { type: Number, default: 0, min: 0 },
  },
  baseSchemaOptions,
);

resellerSchema.index({ email: 1 }, { unique: true });
resellerSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string' } } },
);
resellerSchema.index(
  { googleId: 1 },
  { unique: true, partialFilterExpression: { googleId: { $type: 'string' } } },
);
resellerSchema.index({ name: 'text', shopName: 'text', email: 'text', phone: 'text' });

export const ResellerModel: Model<Reseller> = defineModel<Reseller>('Reseller', resellerSchema);
