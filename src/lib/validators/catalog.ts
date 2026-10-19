import { z } from 'zod';

import { PRODUCT_STATUSES, STOCK_STATUSES, SUPPLIER_STATUSES } from '@lib/constants';

import {
  httpUrl,
  imageAsset,
  money,
  objectId,
  optionalText,
  optionalUrl,
  requiredText,
} from './common';

export const supplierSchema = z.object({
  name: requiredText('Supplier name', 80),
  websiteUrl: httpUrl,
  status: z.enum(SUPPLIER_STATUSES).default('active'),
  notes: optionalText(2000),
});
export type SupplierInput = z.input<typeof supplierSchema>;
export type SupplierOutput = z.output<typeof supplierSchema>;

export const categorySchema = z.object({
  name: requiredText('Category name', 80),
  slug: optionalText(120),
  description: optionalText(500),
  parent: objectId
    .nullish()
    .or(z.literal(''))
    .transform((v) => v || null),
  image: imageAsset.nullish(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});
export type CategoryInput = z.input<typeof categorySchema>;
export type CategoryOutput = z.output<typeof categorySchema>;

export const tagSchema = z.object({
  name: requiredText('Tag name', 40),
});
export type TagInput = z.input<typeof tagSchema>;
export type TagOutput = z.output<typeof tagSchema>;

export const productSchema = z
  .object({
    name: requiredText('Product name', 200),
    slug: optionalText(120),
    shortDescription: optionalText(500),
    description: z.string().max(50_000).optional(),
    category: objectId.or(z.literal('')).refine((v) => v !== '', 'Choose a category'),
    subCategory: objectId
      .nullish()
      .or(z.literal(''))
      .transform((v) => v || null),
    tags: z.array(objectId).max(30).default([]),

    supplier: objectId.or(z.literal('')).refine((v) => v !== '', 'Choose a supplier'),
    supplierProductUrl: optionalUrl,
    supplierPrice: money('Supplier price'),
    price: money('Selling price').refine((v) => v > 0, 'Selling price must be above 0'),
    salePrice: z
      .union([money('Discount price'), z.literal(''), z.null()])
      .optional()
      .transform((v) => (v === '' || v == null || v === 0 ? null : v)),

    stockStatus: z.enum(STOCK_STATUSES).default('in_stock'),
    sku: optionalText(60),
    images: z.array(imageAsset).max(15, 'At most 15 images').default([]),
    variations: z
      .array(
        z.object({
          name: requiredText('Option name', 40),
          values: z
            .array(z.string().trim().min(1).max(60))
            .min(1, 'Add at least one value')
            .max(50),
        }),
      )
      .max(5)
      .default([]),
    specifications: z
      .array(z.object({ label: requiredText('Label', 80), value: requiredText('Value', 300) }))
      .max(50)
      .default([]),
    seo: z
      .object({
        metaTitle: optionalText(120),
        metaDescription: optionalText(320),
        keywords: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
      })
      .prefault({ keywords: [] }),
    status: z.enum(PRODUCT_STATUSES).default('published'),
    isFeatured: z.boolean().default(false),
    isComboOffer: z.boolean().default(false),
  })
  .refine((v) => v.salePrice == null || v.salePrice < v.price, {
    path: ['salePrice'],
    message: 'Discount price must be lower than the selling price',
  });
export type ProductInput = z.input<typeof productSchema>;
export type ProductOutput = z.output<typeof productSchema>;

export const comboSchema = z.object({
  name: requiredText('Combo name', 200),
  slug: optionalText(120),
  shortDescription: optionalText(500),
  description: z.string().max(50_000).optional(),
  images: z.array(imageAsset).max(15, 'At most 15 images').default([]),
  items: z
    .array(
      z.object({
        productId: objectId,
        quantity: z.coerce.number().int().min(1).max(20),
      }),
    )
    .min(2, 'A combo needs at least 2 products')
    .max(10, 'At most 10 products per combo')
    .refine((items) => new Set(items.map((i) => i.productId)).size === items.length, {
      message: 'Each product can only be added once — increase its quantity instead',
    }),
  comboPrice: money('Combo price').refine((v) => v > 0, 'Combo price must be above 0'),
  stockStatus: z.enum(STOCK_STATUSES).default('in_stock'),
  status: z.enum(PRODUCT_STATUSES).default('published'),
  isFeatured: z.boolean().default(false),
});
export type ComboInput = z.input<typeof comboSchema>;
export type ComboOutput = z.output<typeof comboSchema>;
