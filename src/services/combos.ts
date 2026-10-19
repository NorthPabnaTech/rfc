import 'server-only';

import type { QueryFilter } from 'mongoose';

import { connectDB, type Product, ProductModel, type ProductVariation } from '@/database';
import type { AdminComboDTO, Paginated, ProductCardDTO } from '@/types';
import { deleteImages, isOwnCloudinaryAsset } from '@lib/cloudinary';
import { PAGE_SIZE } from '@lib/constants';
import { AppError } from '@lib/errors';
import { sanitizeRichText } from '@lib/sanitize';
import { formatNumber } from '@lib/utils/format';
import type { ComboOutput } from '@lib/validators/catalog';

import { toImage, toProductCard } from './mappers';
import { uniqueSlug } from './slug';

/**
 * Combos are stored as products with `type: 'combo'`, so cart, checkout,
 * orders, reviews and Q&A work on them unchanged. Pricing:
 *   price     = the items' original list prices added up (shown struck through)
 *   salePrice = the bundle price the customer pays — must be lower than
 *               buying the items today at their current (sale) prices
 *   supplierPrice = the items' total supplier cost (for profit)
 */

type PopulatedItem = {
  product:
    | (Pick<Product, 'name' | 'images' | 'effectivePrice' | 'supplierPrice' | 'type' | 'status'> & {
        _id: unknown;
      })
    | null;
  quantity: number;
};

export async function listCombos(page = 1): Promise<Paginated<ProductCardDTO>> {
  await connectDB();
  // Bundles, plus regular products flagged "Show in Combo offers".
  const query: QueryFilter<Product> = {
    status: 'published',
    $or: [{ type: 'combo' }, { isComboOffer: true }],
  };
  const [docs, total] = await Promise.all([
    ProductModel.find(query)
      .sort({ isFeatured: -1, updatedAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    ProductModel.countDocuments(query),
  ]);
  return {
    items: docs.map((d) => toProductCard(d as never)),
    total,
    page,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

function toAdminCombo(
  p: Omit<Product, 'comboItems'> & { comboItems: PopulatedItem[] },
): AdminComboDTO {
  const items = p.comboItems
    .filter((c) => c.product)
    .map((c) => ({
      productId: String(c.product!._id),
      name: c.product!.name,
      image: c.product!.images[0]?.url,
      price: c.product!.effectivePrice,
      supplierPrice: c.product!.supplierPrice,
      quantity: c.quantity,
    }));
  return {
    id: String(p._id),
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription,
    description: p.description,
    images: p.images.map(toImage).filter((i) => !!i),
    items,
    comboPrice: p.effectivePrice,
    regularPrice: items.reduce((s, i) => s + i.price * i.quantity, 0),
    supplierPrice: p.supplierPrice,
    stockStatus: p.stockStatus,
    status: p.status,
    isFeatured: p.isFeatured,
    soldCount: p.soldCount,
    updatedAt: new Date(p.updatedAt).toISOString(),
  };
}

const ITEM_FIELDS = 'name images effectivePrice supplierPrice type status';

export async function listAdminCombos(): Promise<AdminComboDTO[]> {
  await connectDB();
  const docs = await ProductModel.find({ type: 'combo' })
    .sort({ updatedAt: -1 })
    .populate('comboItems.product', ITEM_FIELDS)
    .lean();
  return docs.map((d) => toAdminCombo(d as never));
}

export async function getAdminCombo(id: string): Promise<AdminComboDTO | null> {
  await connectDB();
  const doc = await ProductModel.findOne({ _id: id, type: 'combo' })
    .populate('comboItems.product', ITEM_FIELDS)
    .lean();
  return doc ? toAdminCombo(doc as never) : null;
}

/**
 * A combo takes on its items' options so the customer chooses once for the
 * whole bundle (e.g. 5 T-shirts → "Size: M" for every piece). An option shared
 * by several items offers only the values every one of them has.
 */
function comboVariations(itemVariations: ProductVariation[][]): ProductVariation[] {
  const merged = new Map<string, string[]>();
  for (const variations of itemVariations) {
    for (const v of variations.filter((x) => x.values.length)) {
      const key = v.name.trim();
      const prev = merged.get(key);
      merged.set(key, prev ? prev.filter((val) => v.values.includes(val)) : [...v.values]);
    }
  }
  const empty = [...merged].find(([, values]) => values.length === 0);
  if (empty) {
    throw new AppError(
      `These products have no "${empty[0]}" value in common, so they can't be sold as one combo.`,
    );
  }
  return [...merged].map(([name, values]) => ({ name, values }));
}

export async function saveCombo(
  input: ComboOutput,
  id?: string,
): Promise<{ id: string; slug: string }> {
  await connectDB();
  if (input.images.some((img) => !isOwnCloudinaryAsset(img, 'products'))) {
    throw new AppError('One of the uploaded images is not valid. Please re-upload it.');
  }
  const ids = input.items.map((i) => i.productId);
  const products = await ProductModel.find(
    { _id: { $in: ids } },
    'type price effectivePrice supplierPrice images variations',
  ).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  if (products.length !== ids.length)
    throw new AppError('One or more products in this combo no longer exist.');
  if (products.some((p) => p.type === 'combo'))
    throw new AppError('A combo cannot contain another combo.');
  if (id && ids.includes(id)) throw new AppError('A combo cannot contain itself.');

  const regularPrice = input.items.reduce(
    (s, i) => s + byId.get(i.productId)!.effectivePrice * i.quantity,
    0,
  );
  const listPrice = input.items.reduce((s, i) => s + byId.get(i.productId)!.price * i.quantity, 0);
  const supplierPrice = input.items.reduce(
    (s, i) => s + byId.get(i.productId)!.supplierPrice * i.quantity,
    0,
  );
  if (input.comboPrice >= regularPrice) {
    throw new AppError(
      `The combo price must be lower than buying the items separately (৳${formatNumber(regularPrice)}).`,
    );
  }

  const variations = comboVariations(input.items.map((i) => byId.get(i.productId)!.variations));

  // No images? Use the items' cover images so the combo still looks good.
  const images = input.images.length
    ? input.images
    : input.items.map((i) => byId.get(i.productId)!.images[0]).filter((img) => !!img);

  const slug = await uniqueSlug(ProductModel, input.slug || input.name, id);
  const data = {
    type: 'combo' as const,
    name: input.name,
    slug,
    shortDescription: input.shortDescription,
    description: input.description ? sanitizeRichText(input.description) : undefined,
    images,
    comboItems: input.items.map((i) => ({ product: i.productId, quantity: i.quantity })),
    variations,
    category: null,
    subCategory: null,
    supplier: null,
    supplierPrice,
    price: listPrice,
    salePrice: input.comboPrice,
    stockStatus: input.stockStatus,
    status: input.status,
    isFeatured: input.isFeatured,
  };

  if (id) {
    const doc = await ProductModel.findOne({ _id: id, type: 'combo' });
    if (!doc) throw new AppError('Combo not found.', 404);
    const removed = doc.images.filter(
      (old) => old.publicId && !images.some((n) => n.publicId === old.publicId),
    );
    doc.set(data);
    await doc.save();
    await deleteImages(removed);
    return { id: String(doc._id), slug: doc.slug };
  }
  const doc = await ProductModel.create(data);
  return { id: String(doc._id), slug: doc.slug };
}
