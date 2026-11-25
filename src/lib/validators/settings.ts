import { z } from 'zod';

import { MIN_RESELLER_WITHDRAWAL } from '@lib/constants';

import { money, optionalText, optionalUrl, requiredText } from './common';

export const settingsSchema = z.object({
  storeName: requiredText('Store name', 60),
  tagline: requiredText('Tagline', 120),
  supportPhone: requiredText('Support phone', 20),
  supportEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email')
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  address: requiredText('Address', 200),
  shippingFeeInsideDhaka: money('Inside Dhaka fee'),
  shippingFeeOutsideDhaka: money('Outside Dhaka fee'),
  freeShippingThreshold: money('Free shipping threshold'),
  announcement: optionalText(200),
  whatsappEnabled: z.boolean().default(true),
  whatsappProductEnabled: z.boolean().default(true),
  whatsappDefaultMessage: z
    .string()
    .trim()
    .max(500)
    .default(
      'Hello, I visited your website and would like to know more about your products and services.',
    ),
  social: z.object({
    facebook: optionalUrl,
    instagram: optionalUrl,
    tiktok: optionalUrl,
    whatsapp: optionalText(40),
    youtube: optionalUrl,
  }),
  resellerWithdrawalFeeTiers: z
    .array(
      z.object({
        minAmount: money('From amount'),
        fee: money('Fee').refine((v) => v < MIN_RESELLER_WITHDRAWAL, {
          message: `Fee must be less than the minimum withdrawal (৳${MIN_RESELLER_WITHDRAWAL}).`,
        }),
      }),
    )
    .max(10)
    .default([])
    .superRefine((tiers, ctx) => {
      const seen = new Set<number>();
      tiers.forEach((t, i) => {
        if (seen.has(t.minAmount)) {
          ctx.addIssue({
            code: 'custom',
            path: [i, 'minAmount'],
            message: 'Each tier needs a different “from” amount.',
          });
        }
        seen.add(t.minAmount);
        // The fee must leave something to pay out at the smallest amount the
        // tier applies to.
        const smallest = Math.max(t.minAmount, MIN_RESELLER_WITHDRAWAL);
        if (t.fee >= smallest) {
          ctx.addIssue({
            code: 'custom',
            path: [i, 'fee'],
            message: `Fee must be less than ৳${smallest}.`,
          });
        }
      });
    }),
});
export type SettingsInput = z.input<typeof settingsSchema>;
