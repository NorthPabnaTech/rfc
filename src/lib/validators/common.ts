import { z } from 'zod';

import { IMAGE_SOURCE_TYPES, SHIPPING_ZONES, type ShippingZone } from '@lib/constants';
import { areasOf, deliveryZoneFor, districtsOf, isKnownLocation } from '@lib/locations';

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

/** Required email: trims and lowercases. */
export const requiredEmail = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .max(160, 'Email is too long')
  .email('Enter a valid email');

/** Optional email: trims, lowercases, and turns "" into undefined. */
export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email')
  .optional()
  .or(z.literal(''))
  .transform((v) => v || undefined);

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

/**
 * Address fields. `city` holds the district and `area` the upazila / thana,
 * both picked from lib/locations. `zone` is sent by the form for the live
 * shipping quote, but `withDeliveryZone` recomputes it — never trust the
 * client. Schemas that spread these must end with
 * `.superRefine(checkLocation).transform(withDeliveryZone)`.
 */
export const addressFields = {
  fullName: requiredText('Full name', 80),
  phone: bdPhone,
  addressLine: requiredText('Address', 300),
  division: requiredText('Division', 40),
  city: requiredText('District', 80),
  area: requiredText('Area / Thana', 100),
  zone: z.enum(SHIPPING_ZONES).optional(),
};

type LocationValues = { division: string; city: string; area: string };

export function checkLocation(v: LocationValues, ctx: z.RefinementCtx) {
  if (!districtsOf(v.division).length) {
    ctx.addIssue({ code: 'custom', path: ['division'], message: 'Choose a division' });
  } else if (!areasOf(v.division, v.city).length) {
    ctx.addIssue({ code: 'custom', path: ['city'], message: 'Choose a district' });
  } else if (!isKnownLocation(v.division, v.city, v.area)) {
    ctx.addIssue({ code: 'custom', path: ['area'], message: 'Choose an area / thana' });
  }
}

export function withDeliveryZone<T extends LocationValues>(v: T): T & { zone: ShippingZone } {
  return { ...v, zone: deliveryZoneFor(v.city, v.area) };
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
});
