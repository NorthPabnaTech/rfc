import 'server-only';

import type { QueryFilter, SortOrder } from 'mongoose';

import {
  CategoryModel,
  connectDB,
  type Product,
  ProductModel,
  ReviewModel,
  SupplierModel,
  TagModel,
} from '@/database';
import type {
  AdminProductDTO,
  AdminProductRowDTO,
  Paginated,
  ProductCardDTO,
  ProductDetailDTO,
} from '@/types';
import { deleteImages, isOwnCloudinaryAsset } from '@lib/cloudinary';
import {
  ADMIN_PAGE_SIZE,
  PAGE_SIZE,
  type ProductSort,
  type ProductStatus,
  type StockStatus,
} from '@lib/constants';
import { AppError } from '@lib/errors';
import { sanitizeRichText } from '@lib/sanitize';
import type { ProductOutput } from '@lib/validators/catalog';

import {
  populated,
  toAdminProduct,
  toAdminProductRow,
  toId,
  toImage,
  toProductCard,
} from './mappers';
import { uniqueSlug } from './slug';

const CARD_FIELDS =
  'name slug type comboItems images price salePrice effectivePrice stockStatus ratingAverage ratingCount category variations';

/** Normal catalog listings exclude combos (they have their own section). */
const SINGLES = { type: { $ne: 'combo' } } as const;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function paginate<T>(items: T[], total: number, page: number, pageSize: number): Paginated<T> {
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/* ─── Storefront ─────────────────────────────────────────────────────────── */

export type ProductFilters = {
  q?: string;
  category?: string; // slug
  tags?: string[]; // slugs
  minPrice?: number;
  maxPrice?: number;
  availability?: 'in_stock';
  onSale?: boolean;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
};

const SORTS: Record<ProductSort, Record<string, SortOrder>> = {
  newest: { createdAt: -1 },
  price_asc: { effectivePrice: 1, createdAt: -1 },
  price_desc: { effectivePrice: -1, createdAt: -1 },
  popular: { soldCount: -1, createdAt: -1 },
  rating: { ratingAverage: -1, ratingCount: -1 },
};

export async function searchProducts(filters: ProductFilters): Promise<Paginated<ProductCardDTO>> {
  await connectDB();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? PAGE_SIZE;
  const query: QueryFilter<Product> = { status: 'published', ...SINGLES };

  if (filters.q) {
    const rx = new RegExp(escapeRegex(filters.q.trim().slice(0, 80)), 'i');
    query.$or = [{ name: rx }, { shortDescription: rx }, { sku: rx }, { 'seo.keywords': rx }];
  }
  if (filters.category) {
    const cat = await CategoryModel.findOne({ slug: filters.category, isActive: true }).lean();
    if (!cat) return paginate([], 0, page, pageSize);
    query[cat.parent ? 'subCategory' : 'category'] = cat._id;
  }
  if (filters.tags?.length) {
    const tags = await TagModel.find({ slug: { $in: filters.tags } }, '_id').lean();
    query.tags = { $in: tags.map((t) => t._id) };
  }
  if (filters.minPrice != null || filters.maxPrice != null) {
    query.effectivePrice = {
      ...(filters.minPrice != null ? { $gte: filters.minPrice } : {}),
      ...(filters.maxPrice != null ? { $lte: filters.maxPrice } : {}),
    };
  }
  if (filters.availability === 'in_stock') query.stockStatus = { $ne: 'out_of_stock' };
  if (filters.onSale) query.salePrice = { $ne: null };

  const [docs, total] = await Promise.all([
    ProductModel.find(query, CARD_FIELDS)
      .sort(SORTS[filters.sort ?? 'newest'])
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('category', 'name slug')
      .lean(),
    ProductModel.countDocuments(query),
  ]);
  return paginate(
    docs.map((d) => toProductCard(d as never)),
    total,
    page,
    pageSize,
  );
}

export async function listProductCards(
  kind: 'featured' | 'new' | 'bestsellers' | 'deals' | 'combos',
  limit = 8,
): Promise<ProductCardDTO[]> {
  await connectDB();
  const base: QueryFilter<Product> = { status: 'published', ...SINGLES };
  const variants: Record<typeof kind, [QueryFilter<Product>, Record<string, SortOrder>]> = {
    featured: [{ ...base, isFeatured: true }, { updatedAt: -1 }],
    new: [base, { createdAt: -1 }],
    bestsellers: [base, { soldCount: -1, ratingAverage: -1 }],
    deals: [{ ...base, salePrice: { $ne: null } }, { updatedAt: -1 }],
    combos: [
      { status: 'published', $or: [{ type: 'combo' }, { isComboOffer: true }] },
      { isFeatured: -1, updatedAt: -1 },
    ],
  };
  const [query, sort] = variants[kind];
  const docs = await ProductModel.find(query, CARD_FIELDS)
    .sort(sort)
    .limit(limit)
    .populate('category', 'name slug')
    .lean();
  return docs.map((d) => toProductCard(d as never));
}

export async function getProductBySlug(slug: string): Promise<ProductDetailDTO | null> {
  await connectDB();
  const p = await ProductModel.findOne({ slug, status: 'published' })
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug')
    .populate('tags', 'name slug')
    .populate('comboItems.product', 'name slug images effectivePrice status')
    .lean();
  if (!p) return null;

  const ref = (v: unknown) => {
    const c = populated(v as never) as { _id: unknown; name: string; slug: string } | null;
    return c ? { id: toId(c._id as string), name: c.name, slug: c.slug } : null;
  };

  return {
    ...toProductCard(p as never),
    shortDescription: p.shortDescription,
    description: p.description,
    images: p.images.map(toImage).filter((i) => !!i),
    sku: p.sku,
    variations: p.variations
      .filter((v) => v.values.length)
      .map((v) => ({ name: v.name, values: [...v.values] })),
    specifications: p.specifications.map((s) => ({ label: s.label, value: s.value })),
    category: ref(p.category),
    subCategory: ref(p.subCategory),
    tags: (p.tags as unknown[]).map(ref).filter((t) => !!t),
    seo: {
      metaTitle: p.seo?.metaTitle,
      metaDescription: p.seo?.metaDescription,
      keywords: [...(p.seo?.keywords ?? [])],
    },
    soldCount: p.soldCount,
    comboItems: (
      p.comboItems as unknown as { product: (Product & { _id: string }) | null; quantity: number }[]
    )
      .filter((c) => c.product && c.product.status === 'published')
      .map((c) => ({
        id: String(c.product!._id),
        name: c.product!.name,
        slug: c.product!.slug,
        image: toImage(c.product!.images[0]),
        quantity: c.quantity,
        price: c.product!.effectivePrice,
      })),
  };
}

export async function getRelatedProducts(product: ProductDetailDTO, limit = 8) {
  await connectDB();
  if (!product.category) return [];
  const docs = await ProductModel.find(
    { status: 'published', ...SINGLES, category: product.category.id, _id: { $ne: product.id } },
    CARD_FIELDS,
  )
    .sort({ soldCount: -1, createdAt: -1 })
    .limit(limit)
    .populate('category', 'name slug')
    .lean();
  return docs.map((d) => toProductCard(d as never));
}

export async function listPublishedSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  await connectDB();
  return ProductModel.find({ status: 'published' }, 'slug updatedAt').lean();
}

/* ─── Admin ──────────────────────────────────────────────────────────────── */

export type AdminProductFilters = {
  q?: string;
  category?: string;
  supplier?: string;
  status?: ProductStatus;
  stockStatus?: StockStatus;
  page?: number;
};

export async function listAdminProducts(
  filters: AdminProductFilters,
): Promise<Paginated<AdminProductRowDTO>> {
  await connectDB();
  const page = Math.max(1, filters.page ?? 1);
  const query: QueryFilter<Product> = { ...SINGLES };
  if (filters.q) {
    const rx = new RegExp(escapeRegex(filters.q.trim().slice(0, 80)), 'i');
    query.$or = [{ name: rx }, { sku: rx }, { slug: rx }];
  }
  if (filters.category)
    query.$and = [{ $or: [{ category: filters.category }, { subCategory: filters.category }] }];
  if (filters.supplier) query.supplier = filters.supplier;
  if (filters.status) query.status = filters.status;
  if (filters.stockStatus) query.stockStatus = filters.stockStatus;

  const [docs, total] = await Promise.all([
    ProductModel.find(query)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE)
      .populate('category', 'name')
      .populate('supplier', 'name')
      .lean(),
    ProductModel.countDocuments(query),
  ]);
  return paginate(
    docs.map((d) => toAdminProductRow(d as never)),
    total,
    page,
    ADMIN_PAGE_SIZE,
  );
}

export async function getAdminProduct(id: string): Promise<AdminProductDTO | null> {
  await connectDB();
  const doc = await ProductModel.findById(id).lean();
  return doc ? toAdminProduct(doc) : null;
}

async function validateRefs(input: ProductOutput): Promise<void> {
  const [category, subCategory, supplier, tagCount] = await Promise.all([
    CategoryModel.findById(input.category).lean(),
    input.subCategory ? CategoryModel.findById(input.subCategory).lean() : null,
    SupplierModel.exists({ _id: input.supplier }),
    input.tags.length ? TagModel.countDocuments({ _id: { $in: input.tags } }) : 0,
  ]);
  if (!category || category.parent) throw new AppError('Choose a valid top-level category.');
  if (input.subCategory && (!subCategory || String(subCategory.parent) !== input.category)) {
    throw new AppError('The sub-category must belong to the selected category.');
  }
  if (!supplier) throw new AppError('Choose a valid supplier.');
  if (tagCount !== input.tags.length) throw new AppError('One or more tags no longer exist.');
  if (input.images.some((img) => !isOwnCloudinaryAsset(img, 'products'))) {
    throw new AppError('One of the uploaded images is not valid. Please re-upload it.');
  }
}

export async function saveProduct(
  input: ProductOutput,
  id?: string,
): Promise<{ id: string; slug: string }> {
  await connectDB();
  await validateRefs(input);

  const slug = await uniqueSlug(ProductModel, input.slug || input.name, id);
  const data = {
    ...input,
    slug,
    sku: input.sku?.toUpperCase(),
    description: input.description ? sanitizeRichText(input.description) : undefined,
  };

  if (id) {
    const doc = await ProductModel.findById(id);
    if (!doc) throw new AppError('Product not found.', 404);
    const removed = doc.images.filter(
      (old) => old.publicId && !input.images.some((n) => n.publicId === old.publicId),
    );
    doc.set(data);
    if (!data.sku) doc.set('sku', undefined);
    await doc.save();
    await deleteImages(removed);
    return { id: String(doc._id), slug: doc.slug };
  }

  const doc = await ProductModel.create(data);
  return { id: String(doc._id), slug: doc.slug };
}

export async function deleteProduct(id: string): Promise<void> {
  await connectDB();
  const usedIn = await ProductModel.find({ 'comboItems.product': id }, 'name').lean();
  if (usedIn.length) {
    throw new AppError(
      `This product is part of ${usedIn.length} combo(s): ${usedIn.map((c) => c.name).join(', ')}. Remove it from them first.`,
    );
  }
  const doc = await ProductModel.findByIdAndDelete(id).lean();
  if (!doc) throw new AppError('Product not found.', 404);
  await ReviewModel.deleteMany({ product: id });
  await deleteImages(doc.images);
}

/** Lightweight product search for the admin manual-order item picker. */
export async function pickerSearch(
  q: string,
  { singlesOnly = false }: { singlesOnly?: boolean } = {},
): Promise<
  {
    id: string;
    name: string;
    image?: string;
    price: number;
    supplierPrice: number;
    sku?: string;
    stockStatus: StockStatus;
    variations: { name: string; values: string[] }[];
  }[]
> {
  await connectDB();
  const rx = new RegExp(escapeRegex(q.trim().slice(0, 80)), 'i');
  const docs = await ProductModel.find(
    {
      ...(q.trim() ? { $or: [{ name: rx }, { sku: rx }] } : {}),
      // Combo items can't be combos; their options become the combo's (see saveCombo).
      ...(singlesOnly ? SINGLES : {}),
    },
    'name images effectivePrice supplierPrice sku stockStatus variations',
  )
    .sort({ updatedAt: -1 })
    .limit(15)
    .lean();
  return docs.map((d) => ({
    id: String(d._id),
    name: d.name,
    image: d.images[0]?.url,
    price: d.effectivePrice,
    supplierPrice: d.supplierPrice,
    sku: d.sku,
    stockStatus: d.stockStatus,
    variations: d.variations.map((v) => ({ name: v.name, values: [...v.values] })),
  }));
}

/** Current card data for a list of product ids (wishlist), in the given order. */
export async function listProductCardsByIds(ids: string[]): Promise<ProductCardDTO[]> {
  await connectDB();
  const docs = await ProductModel.find({ _id: { $in: ids }, status: 'published' }, CARD_FIELDS)
    .populate('category', 'name slug')
    .lean();
  const byId = new Map(docs.map((d) => [String(d._id), toProductCard(d as never)]));
  return ids.map((id) => byId.get(id)).filter((p): p is ProductCardDTO => !!p);
}
