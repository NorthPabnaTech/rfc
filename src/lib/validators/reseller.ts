import { z } from 'zod';

import type { TKey, TVars } from '@/i18n/provider';

/*
 * Zod schemas for the reseller platform forms. Each builder takes the active
 * translator so error messages follow the UI language. Phase 2 server
 * actions reuse the same builders (with the English translator).
 */

type T = (key: TKey, vars?: TVars) => string;

export const BD_PHONE = /^(?:\+?88)?01[3-9]\d{8}$/;
const TELEGRAM = /^https:\/\/(t\.me|telegram\.me)\/[A-Za-z0-9_+/-]+$/;

const req = (t: T) => z.string().trim().min(1, t('common.required'));
const phone = (t: T) => z.string().trim().regex(BD_PHONE, t('common.invalidPhone'));
const optionalPhone = (t: T) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || BD_PHONE.test(v), t('common.invalidPhone'));
const email = (t: T) =>
  z.string().trim().min(1, t('common.required')).email(t('common.invalidEmail'));
const money = (t: T, min = 0) =>
  z.coerce
    .number({ message: t('common.required') })
    .min(min, t('common.minAmount', { amount: `৳${min}` }));

export const loginSchema = (t: T) =>
  z.object({ email: email(t), password: req(t), remember: z.boolean().optional() });

export const registerSchema = (t: T) =>
  z
    .object({
      name: req(t),
      shopName: req(t),
      email: email(t),
      phone: phone(t),
      district: req(t),
      password: z.string().min(8, t('auth.passwordMin')),
      confirm: z.string(),
      agree: z.boolean().refine((v) => v, t('auth.agreeRequired')),
    })
    .refine((v) => v.password === v.confirm, {
      path: ['confirm'],
      message: t('auth.passwordMatch'),
    });

export const forgotSchema = (t: T) => z.object({ email: email(t) });

export const resetSchema = (t: T) =>
  z
    .object({ password: z.string().min(8, t('auth.passwordMin')), confirm: z.string() })
    .refine((v) => v.password === v.confirm, {
      path: ['confirm'],
      message: t('auth.passwordMatch'),
    });

export const customerSchema = (t: T) =>
  z.object({
    name: req(t),
    phone: phone(t),
    altPhone: optionalPhone(t),
    address: req(t),
    district: req(t),
    upazila: req(t),
    area: z.enum(['inside_dhaka', 'sub_dhaka', 'outside_dhaka']),
    note: z.string().optional(),
  });

export const productSchema = (t: T) =>
  z.object({
    name: req(t),
    nameBn: req(t),
    description: req(t),
    categoryId: req(t),
    supplierId: req(t),
    supplierCost: money(t, 1),
    platformMargin: money(t, 0),
    deliveryCharge: money(t, 0),
    packagingCharge: money(t, 0),
    suggestedPrice: money(t, 0),
    status: z.enum(['active', 'draft', 'out_of_stock']),
    availability: z.enum(['in_stock', 'limited', 'out_of_stock']),
  });

export const supplierSchema = (t: T) =>
  z.object({
    name: req(t),
    contactPerson: req(t),
    phone: req(t),
    email: email(t),
    sourceUrl: z.string().trim().url(t('common.required')),
    status: z.enum(['active', 'inactive']),
    notes: z.string().optional(),
  });

export const categorySchema = (t: T) =>
  z.object({ name: req(t), nameBn: req(t), icon: req(t), description: z.string().optional() });

export const ticketSchema = (t: T) =>
  z.object({ subject: req(t), message: req(t), priority: z.enum(['low', 'normal', 'high']) });

export const expenseSchema = (t: T) =>
  z.object({
    title: req(t),
    category: z.enum([
      'courier',
      'packaging',
      'marketing',
      'salary',
      'software',
      'office',
      'other',
    ]),
    amount: money(t, 1),
    date: req(t),
    note: z.string().optional(),
  });

export const generalSettingsSchema = (t: T) =>
  z.object({
    platformName: req(t),
    contactEmail: email(t),
    supportPhone: optionalPhone(t),
    currency: req(t),
    timezone: req(t),
  });

export const businessSettingsSchema = (t: T) =>
  z.object({
    defaultMargin: money(t, 0),
    defaultPackagingCharge: money(t, 0),
    inside: money(t, 0),
    sub: money(t, 0),
    outside: money(t, 0),
    minAddBalance: money(t, 1),
    minWithdrawal: money(t, 1),
    threshold: money(t, 1),
    lowFee: money(t, 0),
    highFee: money(t, 0),
    atThresholdFee: money(t, 0),
    earningsReleaseHours: money(t, 0),
  });

export const telegramLink = (t: T) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || TELEGRAM.test(v), t('admin.support.invalidLink'));

export const profileSchema = (t: T) =>
  z.object({
    name: req(t),
    shopName: req(t),
    email: email(t),
    phone: phone(t),
    district: req(t),
    address: req(t),
    payoutMethod: z.enum(['bkash', 'nagad', 'rocket', 'bank']),
    payoutAccount: req(t),
  });
