import { z } from 'zod';

import {
  DEFAULT_BUSINESS_SLUG,
  ORDER_PLATFORMS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  RETURN_REASONS,
  RETURN_STATUSES,
} from '@lib/constants';

import {
  addressFields,
  checkLocation,
  imageAsset,
  money,
  objectId,
  optionalEmail,
  optionalText,
  requiredText,
  withDeliveryZone,
} from './common';

export const cartLineSchema = z.object({
  productId: objectId,
  quantity: z.coerce.number().int().min(1).max(99),
  variant: z.record(z.string().max(40), z.string().max(60)).default({}),
});
export type CartLineInput = z.infer<typeof cartLineSchema>;

/** Plain shape, for forms that drop or add fields (see checkoutSchema). */
export const checkoutFields = z.object({
  items: z.array(cartLineSchema).min(1, 'Your cart is empty').max(50),
  ...addressFields,
  email: optionalEmail,
  paymentMethod: z.enum(PAYMENT_METHODS).default('cod'),
  couponCode: optionalText(32),
  customerNote: optionalText(1000),
  /** Optional: save this address to the signed-in customer's address book. */
  saveAddress: z.boolean().default(false),
});
export const checkoutSchema = checkoutFields.superRefine(checkLocation).transform(withDeliveryZone);
export type CheckoutInput = z.input<typeof checkoutSchema>;

export const manualOrderSchema = z
  .object({
    business: z.string().trim().min(1).max(60).default(DEFAULT_BUSINESS_SLUG),
    platform: z.enum(ORDER_PLATFORMS),
    /** Link to an existing customer account (optional). */
    userId: objectId
      .nullish()
      .or(z.literal(''))
      .transform((v) => v || null),
    customerName: requiredText('Customer name', 80),
    email: optionalEmail,
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
  })
  .superRefine(checkLocation)
  .transform(withDeliveryZone);
export type ManualOrderInput = z.input<typeof manualOrderSchema>;

export const returnItemInputSchema = z.object({
  orderItemId: objectId,
  quantity: z.coerce.number().int().min(1).max(999),
  restock: z.boolean().default(true),
});

export const updateOrderStatusSchema = z.object({
  orderId: objectId,
  status: z.enum(ORDER_STATUSES),
  note: optionalText(500),
  refundAmount: z
    .union([money('Refund amount'), z.literal('')])
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  returnItems: z.array(returnItemInputSchema).optional(),
  customerPaidDelivery: z.boolean().optional(),
  returnDeliveryExpenseAmount: money('Delivery expense amount').optional(),
  /** Reseller orders marked delivered: amount the courier actually collected. */
  codCollected: z
    .union([money('COD collected'), z.literal('')])
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
});

export const updateOrderMetaSchema = z.object({
  orderId: objectId,
  paymentStatus: z.enum(PAYMENT_STATUSES),
  adminNote: optionalText(2000),
});

export const updateOrderAddressSchema = z
  .object({
    orderId: objectId,
    ...addressFields,
  })
  .superRefine(checkLocation)
  .transform(withDeliveryZone);
export type UpdateOrderAddressInput = z.input<typeof updateOrderAddressSchema>;

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
