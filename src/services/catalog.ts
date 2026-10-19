import 'server-only';

import { cache } from 'react';

import { CategoryModel, connectDB, ProductModel, SupplierModel, TagModel } from '@/database';
import type { CategoryDTO, CategoryTreeDTO, SupplierDTO, TagDTO } from '@/types';
import { deleteImages, isOwnCloudinaryAsset } from '@lib/cloudinary';
import { AppError } from '@lib/errors';
import type { CategoryOutput, SupplierOutput, TagOutput } from '@lib/validators/catalog';

import { toCategory, toSupplier, toTag } from './mappers';
import { uniqueSlug } from './slug';

/* ─── Categories ─────────────────────────────────────────────────────────── */

async function productCounts(field: 'category' | 'subCategory' | 'tags' | 'supplier') {
  const rows = await ProductModel.aggregate<{ _id: unknown; count: number }>([
    ...(field === 'tags' ? [{ $unwind: '$tags' }] : []),
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.count]));
}

export async function listCategories(opts: { activeOnly?: boolean } = {}): Promise<CategoryDTO[]> {
  await connectDB();
  const [docs, byCat, bySub] = await Promise.all([
    CategoryModel.find(opts.activeOnly ? { isActive: true } : {})
      .sort({ sortOrder: 1, name: 1 })
      .lean(),
    productCounts('category'),
    productCounts('subCategory'),
  ]);
  return docs.map((c) =>
    toCategory({
      ...c,
      productCount: (byCat.get(String(c._id)) ?? 0) + (bySub.get(String(c._id)) ?? 0),
    }),
  );
}

export function buildCategoryTree(categories: CategoryDTO[]): CategoryTreeDTO[] {
  const roots = categories.filter((c) => !c.parentId);
  return roots.map((r) => ({ ...r, children: categories.filter((c) => c.parentId === r.id) }));
}

/** Active categories as a tree — used by the storefront nav and filters. */
export const getCategoryTree = cache(async (): Promise<CategoryTreeDTO[]> => {
  return buildCategoryTree(await listCategories({ activeOnly: true }));
});

export async function getCategoryBySlug(slug: string): Promise<CategoryDTO | null> {
  await connectDB();
  const doc = await CategoryModel.findOne({ slug, isActive: true }).lean();
  return doc ? toCategory(doc) : null;
}

export async function saveCategory(input: CategoryOutput, id?: string): Promise<CategoryDTO> {
  await connectDB();
  if (input.image && !isOwnCloudinaryAsset(input.image, 'categories')) {
    throw new AppError('Invalid category image.');
  }
  if (input.parent) {
    if (input.parent === id) throw new AppError('A category cannot be its own parent.');
    const parent = await CategoryModel.findById(input.parent).lean();
    if (!parent) throw new AppError('Parent category not found.');
    if (parent.parent) throw new AppError('Sub-categories can only be one level deep.');
    if (id && (await CategoryModel.exists({ parent: id }))) {
      throw new AppError('This category has sub-categories, so it must stay top-level.');
    }
  }

  const slug = await uniqueSlug(CategoryModel, input.slug || input.name, id);
  const data = { ...input, slug, image: input.image ?? undefined };

  if (id) {
    const doc = await CategoryModel.findById(id);
    if (!doc) throw new AppError('Category not found.', 404);
    const oldImage = doc.image;
    doc.set(data);
    if (!input.image) doc.set('image', undefined);
    await doc.save();
    if (oldImage?.publicId && oldImage.publicId !== input.image?.publicId) {
      await deleteImages([oldImage]);
    }
    return toCategory(doc.toObject());
  }
  const doc = await CategoryModel.create(data);
  return toCategory(doc.toObject());
}

export async function deleteCategory(id: string): Promise<void> {
  await connectDB();
  const [inUse, hasChildren] = await Promise.all([
    ProductModel.exists({ $or: [{ category: id }, { subCategory: id }] }),
    CategoryModel.exists({ parent: id }),
  ]);
  if (hasChildren) throw new AppError('Delete or move its sub-categories first.');
  if (inUse) throw new AppError('Products still use this category. Reassign them first.');
  const doc = await CategoryModel.findByIdAndDelete(id).lean();
  if (doc?.image) await deleteImages([doc.image]);
}

/* ─── Tags ───────────────────────────────────────────────────────────────── */

export const listTags = cache(async (): Promise<TagDTO[]> => {
  await connectDB();
  const [docs, counts] = await Promise.all([
    TagModel.find().sort({ name: 1 }).lean(),
    productCounts('tags'),
  ]);
  return docs.map((t) => toTag({ ...t, productCount: counts.get(String(t._id)) ?? 0 }));
});

export async function saveTag(input: TagOutput, id?: string): Promise<TagDTO> {
  await connectDB();
  const slug = await uniqueSlug(TagModel, input.name, id);
  const doc = id
    ? await TagModel.findByIdAndUpdate(
        id,
        { name: input.name, slug },
        { returnDocument: 'after' },
      ).lean()
    : (await TagModel.create({ name: input.name, slug })).toObject();
  if (!doc) throw new AppError('Tag not found.', 404);
  return toTag(doc);
}

export async function deleteTag(id: string): Promise<void> {
  await connectDB();
  await ProductModel.updateMany({ tags: id }, { $pull: { tags: id } });
  await TagModel.findByIdAndDelete(id);
}

/* ─── Suppliers ──────────────────────────────────────────────────────────── */

export async function listSuppliers(opts: { activeOnly?: boolean } = {}): Promise<SupplierDTO[]> {
  await connectDB();
  const [docs, counts] = await Promise.all([
    SupplierModel.find(opts.activeOnly ? { status: 'active' } : {})
      .sort({ name: 1 })
      .lean(),
    productCounts('supplier'),
  ]);
  return docs.map((s) => toSupplier({ ...s, productCount: counts.get(String(s._id)) ?? 0 }));
}

export async function saveSupplier(input: SupplierOutput, id?: string): Promise<SupplierDTO> {
  await connectDB();
  const slug = await uniqueSlug(SupplierModel, input.name, id);
  const data = { ...input, slug };
  const doc = id
    ? await SupplierModel.findByIdAndUpdate(id, data, {
        returnDocument: 'after',
        runValidators: true,
      }).lean()
    : (await SupplierModel.create(data)).toObject();
  if (!doc) throw new AppError('Supplier not found.', 404);
  return toSupplier(doc);
}

export async function deleteSupplier(id: string): Promise<void> {
  await connectDB();
  if (await ProductModel.exists({ supplier: id })) {
    throw new AppError('Products still reference this supplier. Mark it inactive instead.');
  }
  await SupplierModel.findByIdAndDelete(id);
}
