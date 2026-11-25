import 'server-only';

import { z } from 'zod';

import { AppError } from '@lib/errors';
import { categorySchema, productSchema, supplierSchema } from '@lib/validators/reseller';

import { objectId, serverT } from '../http';
import { CategoryModel, OrderModel, ProductModel, SupplierModel } from '../models';

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 80) || 'item'
  );
}

/** A slug that is unique in `model`, ignoring the document being updated. */
async function uniqueSlug(
  model: typeof ProductModel | typeof CategoryModel,
  name: string,
  exceptId?: string,
): Promise<string> {
  const base = slugify(name);
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const taken = await (model as typeof ProductModel).exists({
      slug,
      ...(exceptId ? { _id: { $ne: exceptId } } : {}),
    });
    if (!taken) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/* ─── Categories ─────────────────────────────────────────────────────── */

export const categoryInput = categorySchema(serverT);

export async function saveCategory(input: z.output<typeof categoryInput>, id?: string) {
  const slug = await uniqueSlug(CategoryModel, input.name, id);
  const data = { ...input, description: input.description ?? '', slug };
  if (!id) return (await CategoryModel.create(data)).toObject();
  const doc = await CategoryModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
  if (!doc) throw new AppError('Category not found.', 404);
  return doc;
}

export async function deleteCategory(id: string) {
  if (await ProductModel.exists({ categoryId: id })) {
    throw new AppError('This category still has products. Move them first.', 409);
  }
  await CategoryModel.deleteOne({ _id: id });
}

/* ─── Suppliers ──────────────────────────────────────────────────────── */

export const supplierInput = supplierSchema(serverT);

export async function saveSupplier(input: z.output<typeof supplierInput>, id?: string) {
  const data = { ...input, notes: input.notes ?? '' };
  if (!id) return (await SupplierModel.create(data)).toObject();
  const doc = await SupplierModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
  if (!doc) throw new AppError('Supplier not found.', 404);
  return doc;
}

export async function deleteSupplier(id: string) {
  if (await ProductModel.exists({ supplierId: id })) {
    throw new AppError('This supplier still has products. Reassign them first.', 409);
  }
  await SupplierModel.deleteOne({ _id: id });
}

/* ─── Products ───────────────────────────────────────────────────────── */

export const productInput = productSchema(serverT).extend({
  categoryId: objectId,
  supplierId: objectId,
  images: z
    .array(z.string().trim().refine((v) => /^https:\/\//.test(v) || /^art:\d+$/.test(v), 'Invalid image URL'))
    .max(8)
    .default([]),
});

export async function saveProduct(input: z.output<typeof productInput>, id?: string) {
  const [cat, sup] = await Promise.all([
    CategoryModel.exists({ _id: input.categoryId }),
    SupplierModel.exists({ _id: input.supplierId }),
  ]);
  if (!cat) throw new AppError('Choose a valid category.', 422);
  if (!sup) throw new AppError('Choose a valid supplier.', 422);
  const slug = await uniqueSlug(ProductModel, input.name, id);
  const data = { ...input, slug };
  if (!id) return (await ProductModel.create(data)).toObject();
  const doc = await ProductModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
  if (!doc) throw new AppError('Product not found.', 404);
  return doc;
}

/** Products with orders are kept (orders reference them) — set them to Draft instead. */
export async function deleteProduct(id: string) {
  if (await OrderModel.exists({ productId: id })) {
    throw new AppError('This product has orders. Set it to Draft instead of deleting it.', 409);
  }
  await ProductModel.deleteOne({ _id: id });
}
