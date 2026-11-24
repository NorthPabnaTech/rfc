import { z } from 'zod';

import { CAMPAIGN_SCOPES, CAMPAIGN_TYPES, DISCOUNT_TYPES } from '@lib/constants';

import { objectId, optionalText, requiredText } from './common';

export const campaignSchema = z
  .object({
    title: requiredText('Campaign title', 120),
    description: optionalText(300),
    type: z.enum(CAMPAIGN_TYPES).default('offer'),
    couponCode: z
      .string()
      .trim()
      .toUpperCase()
      .max(32)
      .optional()
      .or(z.literal(''))
      .transform((v) => v || null),
    discountType: z.enum(DISCOUNT_TYPES).default('percentage'),
    discountValue: z.coerce.number().min(0, 'Discount cannot be negative').default(0),
    minOrderAmount: z.coerce.number().min(0).default(0),
    scope: z.enum(CAMPAIGN_SCOPES).default('all'),
    productIds: z.array(objectId).default([]),
    startsAt: z.string().min(1, 'Start date is required'),
    endsAt: z.string().min(1, 'End date is required'),
    isActive: z.boolean().default(true),
    showOnHome: z.boolean().default(true),
    showModal: z.boolean().default(true),
  })
  .superRefine((val, ctx) => {
    if (val.type === 'coupon') {
      if (!val.couponCode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['couponCode'],
          message: 'Coupon code is required for coupon campaigns.',
        });
      } else if (!/^[A-Z0-9_-]{3,32}$/.test(val.couponCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['couponCode'],
          message: 'Use 3–32 letters, numbers, dashes or underscores.',
        });
      }
    }
    if (
      val.discountType !== 'free_delivery' &&
      val.discountType !== 'half_delivery' &&
      val.discountValue < 1
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discountValue'],
        message: 'Discount must be at least 1.',
      });
    }
    if (val.discountType === 'percentage' && val.discountValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discountValue'],
        message: 'Percentage discount cannot exceed 100%.',
      });
    }
    if (val.scope === 'products' && val.productIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['productIds'],
        message: 'Select at least one product.',
      });
    }
    const start = new Date(val.startsAt);
    const end = new Date(val.endsAt);
    if (Number.isNaN(start.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startsAt'],
        message: 'Invalid start date.',
      });
    }
    if (Number.isNaN(end.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsAt'],
        message: 'Invalid end date.',
      });
    }
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsAt'],
        message: 'End date must be after start date.',
      });
    }
  });

export type CampaignInput = z.input<typeof campaignSchema>;
export type CampaignParsed = z.output<typeof campaignSchema>;
