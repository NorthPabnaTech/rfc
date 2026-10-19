import { z } from 'zod';

import { addressFields, bdPhone, imageAsset, requiredText } from './common';

const password = z
  .string({ error: 'Password is required' })
  .min(8, 'Use at least 8 characters')
  .max(128, 'Password is too long');

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.input<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: requiredText('Name', 80),
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    phone: bdPhone,
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterOutput = z.output<typeof registerSchema>;

export const profileSchema = z.object({
  name: requiredText('Name', 80),
  phone: bdPhone,
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

export const addressSchema = z.object({
  label: z.string().trim().max(40).default('Home'),
  ...addressFields,
  isDefault: z.boolean().default(false),
});
export type AddressInput = z.input<typeof addressSchema>;
export type AddressOutput = z.output<typeof addressSchema>;
