import { z } from 'zod';

import { IMAGE_SOURCE_TYPES, SHIPPING_ZONES } from '@lib/constants';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

/** Optional text field: trims, and turns "" into undefined. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .optional()
    .transform((v) => (v ? v : undefined));

export const requiredText = (label: string, max: number) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

/** Bangladeshi mobile number: 01XXXXXXXXX, optionally prefixed +88 / 88. */
export const bdPhone = z
  .string({ error: 'Phone number is required' })
  .trim()
  .transform((v) => v.replace(/[\s-]/g, '').replace(/^\+?88/, ''))
  .pipe(z.string().regex(/^01[3-9]\d{8}$/, 'Enter a valid mobile number, e.g. 01XXXXXXXXX'));

export const httpUrl = z
  .string()
  .trim()
  .url('Enter a valid URL')
  .refine((v) => /^https?:\/\//i.test(v), 'URL must start with http:// or https://');

export const optionalUrl = z
  .union([httpUrl, z.literal('')])
  .optional()
  .transform((v) => (v ? v : undefined));

export const money = (label: string) =>
  z.coerce
    .number({ error: `${label} must be a number` })
    .min(0, `${label} cannot be negative`)
    .max(10_000_000, `${label} is too large`);

export const imageAsset = z.object({
  type: z.enum(IMAGE_SOURCE_TYPES),
  url: httpUrl,
  publicId: z.string().trim().max(300).optional(),
  alt: optionalText(200),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});
export type ImageAssetInput = z.infer<typeof imageAsset>;

export const addressFields = {
  fullName: requiredText('Full name', 80),
  phone: bdPhone,
  addressLine: requiredText('Address', 300),
  area: optionalText(100),
  city: requiredText('City', 80),
  zone: z.enum(SHIPPING_ZONES, { error: 'Choose a delivery zone' }),
};

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
});
