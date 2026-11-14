import { type Model, Schema, type Types } from 'mongoose';

import {
  DEFAULT_BUSINESS_SLUG,
  EXPENSE_PAYMENT_METHODS,
  type ExpensePaymentMethod,
} from '@lib/constants';

import { baseSchemaOptions, defineModel, type ImageAsset, imageAssetSchema } from './shared';

export interface Expense {
  _id: Types.ObjectId;
  title: string;
  category: Types.ObjectId;
  categoryName: string;
  isCostOfGoods: boolean;
  amount: number;
  expenseDate: Date;
  paymentMethod: ExpensePaymentMethod;
  description?: string;
  attachment?: ImageAsset | null;
  business: string;
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<Expense>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'ExpenseCategory',
      required: true,
      index: true,
    },
    categoryName: { type: String, required: true, trim: true, maxlength: 80 },
    isCostOfGoods: { type: Boolean, default: false, index: true },
    amount: { type: Number, required: true, min: 0 },
    expenseDate: { type: Date, required: true, index: true },
    paymentMethod: { type: String, enum: EXPENSE_PAYMENT_METHODS, default: 'cash', index: true },
    description: { type: String, trim: true, maxlength: 2000 },
    attachment: { type: imageAssetSchema, default: null },
    business: { type: String, default: DEFAULT_BUSINESS_SLUG, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  baseSchemaOptions,
);

expenseSchema.index({ business: 1, expenseDate: -1 });
expenseSchema.index({ category: 1, expenseDate: -1 });

export const ExpenseModel: Model<Expense> = defineModel<Expense>('Expense', expenseSchema);
