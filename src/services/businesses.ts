import 'server-only';

import {
  BusinessModel,
  connectDB,
  OrderModel,
  ProductModel,
} from '@/database';
import type { BusinessDTO } from '@/types';
import { DEFAULT_BUSINESS_SLUG } from '@lib/constants';
import { AppError } from '@lib/errors';
import { slugify } from '@lib/slug';
import type { BusinessOutput } from '@lib/validators/management';

import { toBusiness } from './mappers';

const DEFAULT_BUSINESSES = [
  {
    name: 'RFC Gadget',
    slug: DEFAULT_BUSINESS_SLUG,
    description: 'Public gadget & electronics storefront',
    invoicePrefix: 'RFC',
    isPublicStorefront: true,
    isActive: true,
  },
  {
    name: 'Fashion Store',
    slug: 'fashion_store',
    description: 'Internal fashion & apparel business (admin managed)',
    invoicePrefix: 'FSH',
    isPublicStorefront: false,
    isActive: true,
  },
] as const;

let seeded = false;

export async function ensureDefaultBusinesses(): Promise<void> {
  if (seeded) return;
  await connectDB();
  for (const b of DEFAULT_BUSINESSES) {
    await BusinessModel.updateOne(
      { slug: b.slug },
      { $setOnInsert: b },
      { upsert: true },
    );
  }
  seeded = true;
}

export async function listBusinesses(
  { activeOnly = false }: { activeOnly?: boolean } = {},
): Promise<BusinessDTO[]> {
  await ensureDefaultBusinesses();
  const query = activeOnly ? { isActive: true } : {};
  const [docs, productCounts, orderCounts] = await Promise.all([
    BusinessModel.find(query).sort({ isPublicStorefront: -1, createdAt: 1 }).lean(),
    ProductModel.aggregate<{ _id: string | null; n: number }>([
      { $group: { _id: '$business', n: { $sum: 1 } } },
    ]),
    OrderModel.aggregate<{ _id: string | null; n: number }>([
      { $group: { _id: '$business', n: { $sum: 1 } } },
    ]),
  ]);

  const pMap = new Map<string, number>();
  for (const r of productCounts) {
    const key = r._id || DEFAULT_BUSINESS_SLUG;
    pMap.set(key, (pMap.get(key) ?? 0) + r.n);
  }
  const oMap = new Map<string, number>();
  for (const r of orderCounts) {
    const key = r._id || DEFAULT_BUSINESS_SLUG;
    oMap.set(key, (oMap.get(key) ?? 0) + r.n);
  }

  return docs.map((d) =>
    toBusiness({
      ...d,
      productCount: pMap.get(d.slug) ?? 0,
      orderCount: oMap.get(d.slug) ?? 0,
    }),
  );
}

export function businessQueryFilter(
  business = DEFAULT_BUSINESS_SLUG,
): string | { $in: (string | null)[] } {
  return business === DEFAULT_BUSINESS_SLUG
    ? { $in: [DEFAULT_BUSINESS_SLUG, null] }
    : business;
}

export async function resolvePublicStorefrontBusiness(slug?: string | null): Promise<string> {
  const normalized = slug?.trim().toLowerCase();
  if (!normalized || normalized === DEFAULT_BUSINESS_SLUG) return DEFAULT_BUSINESS_SLUG;
  await ensureDefaultBusinesses();
  const doc = await BusinessModel.findOne(
    { slug: normalized, isActive: true, isPublicStorefront: true },
    'slug',
  ).lean();
  if (!doc) throw new AppError('Storefront not found or not public.', 404);
  return doc.slug;
}

export async function getBusinessBySlug(slug: string): Promise<BusinessDTO | null> {
  await ensureDefaultBusinesses();
  const doc = await BusinessModel.findOne({ slug }).lean();
  return doc ? toBusiness(doc) : null;
}

export async function saveBusiness(input: BusinessOutput, id?: string): Promise<BusinessDTO> {
  await ensureDefaultBusinesses();
  if (id) {
    const doc = await BusinessModel.findById(id);
    if (!doc) throw new AppError('Business not found.', 404);
    const wasPublic = doc.isPublicStorefront;
    doc.name = input.name;
    doc.description = input.description;
    doc.invoicePrefix = input.invoicePrefix;
    doc.phone = input.phone;
    doc.address = input.address;
    doc.logo = input.logo ?? undefined;
    if (doc.slug !== DEFAULT_BUSINESS_SLUG) {
      doc.isActive = input.isActive;
      doc.isPublicStorefront = input.isPublicStorefront;
    }
    await doc.save();
    if (!wasPublic && doc.isPublicStorefront) {
      await ProductModel.updateMany(
        { business: doc.slug, visibility: 'private' },
        { $set: { visibility: 'public' } },
      );
    }
    return toBusiness(doc.toObject());
  }

  const rawSlug = slugify(input.slug || input.name).replace(/-/g, '_');
  if (!rawSlug) throw new AppError('Please provide a valid business name or slug.');
  const exists = await BusinessModel.exists({ slug: rawSlug });
  if (exists) throw new AppError('A business with this slug already exists.');

  const doc = await BusinessModel.create({
    name: input.name,
    slug: rawSlug,
    description: input.description,
    invoicePrefix: input.invoicePrefix,
    phone: input.phone,
    address: input.address,
    logo: input.logo ?? undefined,
    isPublicStorefront: input.isPublicStorefront,
    isActive: input.isActive,
  });
  return toBusiness(doc.toObject());
}
