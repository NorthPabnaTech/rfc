import { z } from 'zod';

import {
  addressFields,
  bdPhone,
  checkLocation,
  imageAsset,
  requiredEmail,
  requiredText,
  withDeliveryZone,
} from './common';

const password = z
  .string({ error: 'Password is required' })
  .min(8, 'Use at least 8 characters')
  .max(128, 'Password is too long');

/**
 * Sign in with email or mobile number. Anything with "@" is an email;
 * anything else must be a Bangladeshi mobile number (normalized to 01XXXXXXXXX).
 */
export const loginIdentifier = z
  .string({ error: 'Enter your email or mobile number' })
  .trim()
  .min(1, 'Enter your email or mobile number')
  .transform((v, ctx) => {
    if (v.includes('@')) {
      const email = z.string().email().safeParse(v.toLowerCase());
      if (email.success) return { email: email.data };
      ctx.addIssue({ code: 'custom', message: 'Enter a valid email' });
      return z.NEVER;
    }
    const phone = bdPhone.safeParse(v);
    if (phone.success) return { phone: phone.data };
    ctx.addIssue({ code: 'custom', message: 'Enter a valid email or mobile number' });
    return z.NEVER;
  });
export type LoginIdentifier = z.output<typeof loginIdentifier>;

export const loginSchema = z.object({
  identifier: loginIdentifier,
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.input<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: requiredText('Name', 80),
    phone: bdPhone,
    // Required so the customer can always reset a forgotten password.
    email: requiredEmail,
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterOutput = z.output<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email: requiredEmail });
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, 'This reset link is invalid').max(200),
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
export type ResetPasswordOutput = z.output<typeof resetPasswordSchema>;

export const profileSchema = z.object({
  name: requiredText('Name', 80),
  phone: bdPhone,
  email: requiredEmail,
  avatar: imageAsset.nullish(),
});
export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileOutput = z.output<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;

export const addressSchema = z
  .object({
    label: z.string().trim().max(40).default('Home'),
    ...addressFields,
    isDefault: z.boolean().default(false),
  })
  .superRefine(checkLocation)
  .transform(withDeliveryZone);
export type AddressInput = z.input<typeof addressSchema>;
export type AddressOutput = z.output<typeof addressSchema>;
