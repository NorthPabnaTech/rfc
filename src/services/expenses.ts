import 'server-only';

import type { QueryFilter } from 'mongoose';

import {
  connectDB,
  type Expense,
  ExpenseCategoryModel,
  ExpenseModel,
} from '@/database';
import type { ExpenseCategoryDTO, ExpenseDTO, Paginated } from '@/types';
import { deleteImages, isOwnCloudinaryAsset } from '@lib/cloudinary';
import {
  ADMIN_PAGE_SIZE,
  DEFAULT_BUSINESS_SLUG,
  type ExpensePaymentMethod,
} from '@lib/constants';
import { AppError } from '@lib/errors';
import { slugify } from '@lib/slug';
import { dayjs } from '@lib/utils';
import type { ExpenseCategoryOutput, ExpenseOutput } from '@lib/validators/management';

import { toExpense, toExpenseCategory } from './mappers';

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Facebook Ads / Marketing', slug: 'facebook-ads-marketing', isSystem: true, isCostOfGoods: false },
  { name: 'Hosting & Domain', slug: 'hosting-domain', isSystem: true, isCostOfGoods: false },
  {
    name: 'Supplier / Product Purchase Cost',
    slug: 'supplier-product-purchase-cost',
    isSystem: true,
    isCostOfGoods: true,
  },
  { name: 'Delivery / Courier Charges', slug: 'delivery-courier-charges', isSystem: true, isCostOfGoods: false },
  { name: 'Packaging Cost', slug: 'packaging-cost', isSystem: true, isCostOfGoods: false },
  { name: 'Other Business Expenses', slug: 'other-business-expenses', isSystem: true, isCostOfGoods: false },
] as const;

let categoriesSeeded = false;

export async function ensureDefaultExpenseCategories(): Promise<void> {
  if (categoriesSeeded) return;
  await connectDB();
  for (const c of DEFAULT_EXPENSE_CATEGORIES) {
    await ExpenseCategoryModel.updateOne(
      { slug: c.slug },
      { $setOnInsert: c },
      { upsert: true },
    );
  }
  categoriesSeeded = true;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listExpenseCategories(): Promise<ExpenseCategoryDTO[]> {
  await ensureDefaultExpenseCategories();
  const [docs, counts] = await Promise.all([
    ExpenseCategoryModel.find().sort({ isSystem: -1, name: 1 }).lean(),
    ExpenseModel.aggregate<{ _id: unknown; n: number }>([
      { $group: { _id: '$category', n: { $sum: 1 } } },
    ]),
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c.n]));
  return docs.map((d) => toExpenseCategory({ ...d, expenseCount: map.get(String(d._id)) ?? 0 }));
}

export async function saveExpenseCategory(
  input: ExpenseCategoryOutput,
  id?: string,
): Promise<ExpenseCategoryDTO> {
  await ensureDefaultExpenseCategories();
  const slug = slugify(input.name);
  if (!slug) throw new AppError('Please enter a valid category name.');

  if (id) {
    const doc = await ExpenseCategoryModel.findById(id);
    if (!doc) throw new AppError('Expense category not found.', 404);
    const conflict = await ExpenseCategoryModel.exists({ slug, _id: { $ne: id } });
    if (conflict) throw new AppError('An expense category with this name already exists.');
    doc.name = input.name;
    doc.slug = slug;
    if (!doc.isSystem) doc.isCostOfGoods = input.isCostOfGoods;
    await doc.save();
    await ExpenseModel.updateMany(
      { category: doc._id },
      { $set: { categoryName: doc.name, isCostOfGoods: doc.isCostOfGoods } },
    );
    return toExpenseCategory(doc.toObject());
  }

  const exists = await ExpenseCategoryModel.exists({ slug });
  if (exists) throw new AppError('An expense category with this name already exists.');
  const doc = await ExpenseCategoryModel.create({
    name: input.name,
    slug,
    isSystem: false,
    isCostOfGoods: input.isCostOfGoods,
  });
  return toExpenseCategory(doc.toObject());
}

export async function deleteExpenseCategory(id: string): Promise<void> {
  await ensureDefaultExpenseCategories();
  const doc = await ExpenseCategoryModel.findById(id).lean();
  if (!doc) throw new AppError('Expense category not found.', 404);
  if (doc.isSystem) throw new AppError('Default expense categories cannot be deleted.');
  const used = await ExpenseModel.exists({ category: id });
  if (used) throw new AppError('Cannot delete a category that has recorded expenses.');
  await ExpenseCategoryModel.deleteOne({ _id: id });
}

export type ExpenseFilters = {
  q?: string;
  categoryId?: string;
  business?: string;
  paymentMethod?: ExpensePaymentMethod;
  from?: string;
  to?: string;
  page?: number;
};

export async function listExpenses(
  f: ExpenseFilters,
): Promise<Paginated<ExpenseDTO> & { totalAmount: number }> {
  await ensureDefaultExpenseCategories();
  const page = Math.max(1, f.page ?? 1);
  const query: QueryFilter<Expense> = {};

  if (f.q) {
    const rx = new RegExp(escapeRegex(f.q.trim().slice(0, 80)), 'i');
    query.$or = [{ title: rx }, { description: rx }, { categoryName: rx }];
  }
  if (f.categoryId) query.category = f.categoryId;
  if (f.business && f.business !== 'all') {
    query.business =
      f.business === DEFAULT_BUSINESS_SLUG
        ? { $in: [DEFAULT_BUSINESS_SLUG, null] }
        : f.business;
  }
  if (f.paymentMethod) query.paymentMethod = f.paymentMethod;
  if (f.from || f.to) {
    query.expenseDate = {
      ...(f.from ? { $gte: dayjs.tz(f.from, 'Asia/Dhaka').startOf('day').toDate() } : {}),
      ...(f.to ? { $lte: dayjs.tz(f.to, 'Asia/Dhaka').endOf('day').toDate() } : {}),
    };
  }

  const [docs, total, sumAgg] = await Promise.all([
    ExpenseModel.find(query)
      .sort({ expenseDate: -1, createdAt: -1 })
      .skip((page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE)
      .populate('createdBy', 'name')
      .lean(),
    ExpenseModel.countDocuments(query),
    ExpenseModel.aggregate<{ total: number }>([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  return {
    items: docs.map((d) => toExpense(d as never)),
    total,
    totalAmount: sumAgg[0]?.total ?? 0,
    page,
    pageSize: ADMIN_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}

export async function saveExpense(
  input: ExpenseOutput,
  createdBy: string,
  id?: string,
): Promise<ExpenseDTO> {
  await ensureDefaultExpenseCategories();
  const category = await ExpenseCategoryModel.findById(input.categoryId).lean();
  if (!category) throw new AppError('Choose a valid expense category.');
  if (input.attachment && !isOwnCloudinaryAsset(input.attachment, 'expenses')) {
    throw new AppError('Uploaded attachment is not valid. Please re-upload it.');
  }

  const parsedDate = dayjs.tz(input.expenseDate, 'Asia/Dhaka');
  if (!parsedDate.isValid()) throw new AppError('Please choose a valid expense date.');

  const payload = {
    title: input.title,
    category: category._id,
    categoryName: category.name,
    isCostOfGoods: category.isCostOfGoods,
    amount: input.amount,
    expenseDate: parsedDate.startOf('day').toDate(),
    paymentMethod: input.paymentMethod,
    description: input.description,
    attachment: input.attachment ?? null,
    business: input.business || DEFAULT_BUSINESS_SLUG,
  };

  if (id) {
    const doc = await ExpenseModel.findById(id);
    if (!doc) throw new AppError('Expense not found.', 404);
    const oldAtt = doc.attachment;
    doc.set(payload);
    await doc.save();
    if (
      oldAtt?.publicId &&
      oldAtt.publicId !== input.attachment?.publicId
    ) {
      await deleteImages([oldAtt]);
    }
    return toExpense(doc.toObject());
  }

  const doc = await ExpenseModel.create({
    ...payload,
    createdBy,
  });
  return toExpense(doc.toObject());
}

export async function deleteExpense(id: string): Promise<void> {
  await connectDB();
  const doc = await ExpenseModel.findByIdAndDelete(id).lean();
  if (!doc) throw new AppError('Expense not found.', 404);
  if (doc.attachment) await deleteImages([doc.attachment]);
}
