import { z } from 'zod';

import {
  ORDER_PLATFORMS,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  RETURN_REASONS,
  RETURN_STATUSES,
} from '@lib/constants';

import { addressFields, imageAsset, money, objectId, optionalText, requiredText } from './common';

export const cartLineSchema = z.object({
  productId: objectId,
  quantity: z.coerce.number().int().min(1).max(99),
  variant: z.record(z.string().max(40), z.string().max(60)).default({}),
});
export type CartLineInput = z.infer<typeof cartLineSchema>;

export const checkoutSchema = z.object({
  items: z.array(cartLineSchema).min(1, 'Your cart is empty').max(50),
  ...addressFields,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email')
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  customerNote: optionalText(1000),
  /** Optional: save this address to the signed-in customer's address book. */
  saveAddress: z.boolean().default(false),
});
export type CheckoutInput = z.input<typeof checkoutSchema>;

export const manualOrderSchema = z.object({
  platform: z.enum(ORDER_PLATFORMS),
  /** Link to an existing customer account (optional). */
  userId: objectId
    .nullish()
    .or(z.literal(''))
    .transform((v) => v || null),
  customerName: requiredText('Customer name', 80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email')
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  ...addressFields,
  items: z.array(cartLineSchema).min(1, 'Add at least one product').max(50),
  /** Override the per-zone shipping fee (e.g. negotiated in chat). */
  shippingFee: z
    .union([money('Shipping fee'), z.literal('')])
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : v)),
  discount: z
    .union([money('Discount'), z.literal('')])
    .optional()
    .transform((v) => (v === '' || v === undefined ? 0 : v)),
  status: z.enum(['pending', 'confirmed']).default('confirmed'),
  customerNote: optionalText(1000),
  adminNote: optionalText(2000),
});
export type ManualOrderInput = z.input<typeof manualOrderSchema>;

export const updateOrderStatusSchema = z.object({
  orderId: objectId,
  status: z.enum(ORDER_STATUSES),
  note: optionalText(500),
});

export const updateOrderMetaSchema = z.object({
  orderId: objectId,
  paymentStatus: z.enum(PAYMENT_STATUSES),
  adminNote: optionalText(2000),
});

export const cancelOrderSchema = z.object({
  orderId: objectId,
  reason: optionalText(500),
});

export const trackOrderSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^RFC-\d{6,}$/, 'Order number looks like RFC-100001'),
  phone: addressFields.phone,
});

export const returnRequestSchema = z.object({
  orderId: objectId,
  reason: z.enum(RETURN_REASONS, { error: 'Choose a reason' }),
  description: optionalText(2000),
  images: z.array(imageAsset).max(5, 'At most 5 images').default([]),
});
export type ReturnRequestInput = z.input<typeof returnRequestSchema>;

export const updateReturnSchema = z.object({
  returnId: objectId,
  status: z.enum(RETURN_STATUSES),
  adminNote: optionalText(2000),
  refundAmount: z
    .union([money('Refund amount'), z.literal('')])
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
});

export const reviewSchema = z.object({
  productId: objectId,
  rating: z.coerce.number().int().min(1, 'Choose a rating').max(5),
  comment: requiredText('Review', 2000).min(5, 'Tell us a little more (5+ characters)'),
  images: z.array(imageAsset).max(5, 'At most 5 images').default([]),
});
export type ReviewInput = z.input<typeof reviewSchema>;

export const questionSchema = z.object({
  productId: objectId,
  question: requiredText('Question', 1000).min(5, 'Please write a complete question'),
});

export const answerSchema = z.object({
  questionId: objectId,
  answer: requiredText('Answer', 2000),
});
