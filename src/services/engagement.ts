import 'server-only';

import { Types } from 'mongoose';

import { connectDB, OrderModel, ProductModel, QuestionModel, ReviewModel } from '@/database';
import type { Paginated, QuestionDTO, ReviewDTO } from '@/types';
import { deleteImages, isOwnCloudinaryAsset } from '@lib/cloudinary';
import { ADMIN_PAGE_SIZE } from '@lib/constants';
import { AppError } from '@lib/errors';
import type { ImageAssetInput } from '@lib/validators/common';

import { toQuestion, toReview } from './mappers';

function paged<T>(items: T[], total: number, page: number): Paginated<T> {
  return {
    items,
    total,
    page,
    pageSize: ADMIN_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}

/* ─── Reviews ────────────────────────────────────────────────────────────── */

async function recomputeRating(productId: string | Types.ObjectId) {
  const [agg] = await ReviewModel.aggregate<{ avg: number; n: number }>([
    { $match: { product: new Types.ObjectId(String(productId)), isHidden: false } },
    { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } },
  ]);
  await ProductModel.updateOne(
    { _id: productId },
    { $set: { ratingAverage: Math.round((agg?.avg ?? 0) * 10) / 10, ratingCount: agg?.n ?? 0 } },
  );
}

/**
 * A customer may review a product once they have a delivered/completed
 * order containing it. Returns that order's id, or null.
 */
export async function findReviewableOrder(userId: string, productId: string) {
  await connectDB();
  const order = await OrderModel.findOne(
    { user: userId, status: { $in: ['delivered', 'completed'] }, 'items.product': productId },
    '_id',
  ).lean();
  return order ? String(order._id) : null;
}

export async function getReviewEligibility(userId: string | null, productId: string) {
  if (!userId) return { canReview: false, reason: 'signin' as const };
  await connectDB();
  if (await ReviewModel.exists({ user: userId, product: productId })) {
    return { canReview: false, reason: 'reviewed' as const };
  }
  const orderId = await findReviewableOrder(userId, productId);
  return orderId
    ? { canReview: true, reason: null }
    : { canReview: false, reason: 'not_purchased' as const };
}

export async function createReview(
  userId: string,
  input: { productId: string; rating: number; comment: string; images: ImageAssetInput[] },
) {
  await connectDB();
  if (input.images.some((i) => i.type !== 'cloudinary' || !isOwnCloudinaryAsset(i, 'reviews'))) {
    throw new AppError('Please upload review photos using the upload button.');
  }
  const orderId = await findReviewableOrder(userId, input.productId);
  if (!orderId) throw new AppError('You can review products after they are delivered to you.');
  if (await ReviewModel.exists({ user: userId, product: input.productId })) {
    throw new AppError('You have already reviewed this product.');
  }
  await ReviewModel.create({
    product: input.productId,
    user: userId,
    order: orderId,
    rating: input.rating,
    comment: input.comment,
    images: input.images,
  });
  await recomputeRating(input.productId);
}

export async function listProductReviews(productId: string, limit = 20) {
  await connectDB();
  const query = { product: productId, isHidden: false };
  const [docs, breakdown] = await Promise.all([
    ReviewModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('user', 'name avatar')
      .lean(),
    ReviewModel.aggregate<{ _id: number; n: number }>([
      { $match: { product: new Types.ObjectId(productId), isHidden: false } },
      { $group: { _id: '$rating', n: { $sum: 1 } } },
    ]),
  ]);
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  breakdown.forEach((b) => (counts[b._id] = b.n));
  return { reviews: docs.map((d) => toReview(d as never)), counts };
}

export async function listAdminReviews(f: {
  q?: string;
  visibility?: 'visible' | 'hidden';
  rating?: number;
  page?: number;
}): Promise<Paginated<ReviewDTO>> {
  await connectDB();
  const page = Math.max(1, f.page ?? 1);
  const query: Record<string, unknown> = {};
  if (f.visibility) query.isHidden = f.visibility === 'hidden';
  if (f.rating) query.rating = f.rating;
  if (f.q) query.comment = new RegExp(f.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const [docs, total] = await Promise.all([
    ReviewModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE)
      .populate('user', 'name avatar')
      .populate('product', 'name slug')
      .lean(),
    ReviewModel.countDocuments(query),
  ]);
  return paged(
    docs.map((d) => toReview(d as never)),
    total,
    page,
  );
}

export async function setReviewHidden(id: string, isHidden: boolean) {
  await connectDB();
  const doc = await ReviewModel.findByIdAndUpdate(
    id,
    { isHidden },
    { returnDocument: 'after' },
  ).lean();
  if (!doc) throw new AppError('Review not found.', 404);
  await recomputeRating(doc.product);
}

export async function deleteReview(id: string) {
  await connectDB();
  const doc = await ReviewModel.findByIdAndDelete(id).lean();
  if (!doc) throw new AppError('Review not found.', 404);
  await deleteImages(doc.images);
  await recomputeRating(doc.product);
}

/* ─── Questions ──────────────────────────────────────────────────────────── */

export async function askQuestion(userId: string, productId: string, question: string) {
  await connectDB();
  if (!(await ProductModel.exists({ _id: productId, status: 'published' }))) {
    throw new AppError('Product not found.', 404);
  }
  const recent = await QuestionModel.countDocuments({
    user: userId,
    createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
  });
  if (recent >= 10)
    throw new AppError('You have asked a lot of questions recently. Please try later.');
  await QuestionModel.create({ product: productId, user: userId, question });
}

/** Answered, visible questions — plus the viewer's own pending ones. */
export async function listProductQuestions(productId: string, viewerId?: string | null) {
  await connectDB();
  const docs = await QuestionModel.find({
    product: productId,
    isHidden: false,
    $or: [
      { answer: { $exists: true, $ne: '' } },
      ...(viewerId ? [{ user: new Types.ObjectId(viewerId) }] : []),
    ],
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('user', 'name')
    .lean();
  return docs.map((d) => toQuestion(d as never));
}

export async function listAdminQuestions(f: {
  state?: 'unanswered' | 'answered' | 'hidden';
  page?: number;
}): Promise<Paginated<QuestionDTO>> {
  await connectDB();
  const page = Math.max(1, f.page ?? 1);
  const query: Record<string, unknown> = {};
  if (f.state === 'unanswered')
    Object.assign(query, { answer: { $in: [null, ''] }, isHidden: false });
  if (f.state === 'answered') query.answer = { $exists: true, $nin: [null, ''] };
  if (f.state === 'hidden') query.isHidden = true;
  const [docs, total] = await Promise.all([
    QuestionModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE)
      .populate('user', 'name')
      .populate('product', 'name slug')
      .lean(),
    QuestionModel.countDocuments(query),
  ]);
  return paged(
    docs.map((d) => toQuestion(d as never)),
    total,
    page,
  );
}

export async function answerQuestion(id: string, answer: string, by: string) {
  await connectDB();
  const res = await QuestionModel.updateOne(
    { _id: id },
    { $set: { answer, answeredAt: new Date(), answeredBy: by } },
  );
  if (!res.matchedCount) throw new AppError('Question not found.', 404);
}

export async function setQuestionHidden(id: string, isHidden: boolean) {
  await connectDB();
  await QuestionModel.updateOne({ _id: id }, { $set: { isHidden } });
}

export async function deleteQuestion(id: string) {
  await connectDB();
  await QuestionModel.deleteOne({ _id: id });
}

/** Recent, visible, well-rated reviews with text — for the homepage. */
export async function listFeaturedReviews(limit = 6): Promise<ReviewDTO[]> {
  await connectDB();
  const docs = await ReviewModel.find({ isHidden: false, rating: { $gte: 4 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name avatar')
    .populate('product', 'name slug')
    .lean();
  return docs.map((d) => toReview(d as never));
}
