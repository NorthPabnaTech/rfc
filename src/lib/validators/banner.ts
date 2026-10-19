import { z } from 'zod';

import { BANNER_POSITIONS } from '@lib/constants';

import { imageAsset, optionalText, requiredText } from './common';

/** Internal path ("/products?onSale=1") or full URL. */
const link = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\//i.test(v), {
    message: 'Use a path like /products?onSale=1 or a full https:// link',
  })
  .optional()
  .transform((v) => v || undefined);

/** "" → null; otherwise a date (from a date input, "YYYY-MM-DD"). */
const optionalDate = z
  .union([z.literal(''), z.null(), z.coerce.date()])
  .optional()
  .transform((v) => (v instanceof Date ? v : null));

export const bannerSchema = z.object({
  title: requiredText('Title', 120),
  description: optionalText(300),
  eyebrow: optionalText(40),
  image: imageAsset.nullable().refine((v) => !!v, 'Upload a banner image'),
  ctaLabel: optionalText(40),
  link,
  position: z.enum(BANNER_POSITIONS),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  startsAt: optionalDate,
  endsAt: optionalDate,
});
export type BannerInput = z.input<typeof bannerSchema>;
export type BannerOutput = Omit<z.output<typeof bannerSchema>, 'image'> & {
  image: NonNullable<z.output<typeof bannerSchema>['image']>;
};
