import { z } from 'zod';

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
  social: z.object({
    facebook: optionalUrl,
    instagram: optionalUrl,
    tiktok: optionalUrl,
    whatsapp: optionalText(40),
    youtube: optionalUrl,
  }),
});
export type SettingsInput = z.input<typeof settingsSchema>;
