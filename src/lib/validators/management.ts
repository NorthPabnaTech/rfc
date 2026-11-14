import { z } from 'zod';

import { DEFAULT_BUSINESS_SLUG, EXPENSE_PAYMENT_METHODS } from '@lib/constants';

import { imageAsset, money, objectId, optionalText, requiredText } from './common';

export const businessSchema = z.object({
  name: requiredText('Business name', 80),
  slug: optionalText(60),
  description: optionalText(500),
  invoicePrefix: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Invoice prefix must be 2–10 characters')
    .max(10, 'Invoice prefix must be 2–10 characters')
    .regex(/^[A-Z0-9-]+$/, 'Letters, numbers, and hyphens only'),
  phone: optionalText(30),
  address: optionalText(300),
  logo: imageAsset.nullable().optional(),
  isActive: z.boolean().default(true),
});
export type BusinessInput = z.input<typeof businessSchema>;
export type BusinessOutput = z.output<typeof businessSchema>;

export const stockAdjustmentSchema = z.object({
  productId: objectId,
  type: z.enum(['stock_in', 'stock_out']),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(100_000),
  reason: requiredText('Reason', 120),
  date: z.string().trim().optional(),
  notes: optionalText(1000),
});
export type StockAdjustmentInput = z.input<typeof stockAdjustmentSchema>;
export type StockAdjustmentOutput = z.output<typeof stockAdjustmentSchema>;

export const expenseCategorySchema = z.object({
  name: requiredText('Category name', 80),
  isCostOfGoods: z.boolean().default(false),
});
export type ExpenseCategoryInput = z.input<typeof expenseCategorySchema>;
export type ExpenseCategoryOutput = z.output<typeof expenseCategorySchema>;

export const expenseSchema = z.object({
  title: requiredText('Expense title', 160),
  categoryId: objectId.or(z.literal('')).refine((v) => v !== '', 'Choose a category'),
  amount: money('Amount').refine((v) => v > 0, 'Amount must be greater than 0'),
  expenseDate: z.string().trim().min(1, 'Choose a date'),
  paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS).default('cash'),
  description: optionalText(2000),
  attachment: imageAsset.nullish(),
  business: z.string().trim().min(1).max(60).default(DEFAULT_BUSINESS_SLUG),
});
export type ExpenseInput = z.input<typeof expenseSchema>;
export type ExpenseOutput = z.output<typeof expenseSchema>;
