import { type Model, Schema, type Types } from 'mongoose';

import { baseSchemaOptions, defineModel } from './shared';

export interface ExpenseCategory {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  isSystem: boolean;
  /**
   * True for product procurement / supplier purchase costs so financial
   * analytics do not double-count them alongside COGS.
   */
  isCostOfGoods: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const expenseCategorySchema = new Schema<ExpenseCategory>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
    isSystem: { type: Boolean, default: false },
    isCostOfGoods: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);

expenseCategorySchema.index({ slug: 1 }, { unique: true });

export const ExpenseCategoryModel: Model<ExpenseCategory> = defineModel<ExpenseCategory>(
  'ExpenseCategory',
  expenseCategorySchema,
);
