import 'server-only';

import type { ClientSession, QueryFilter } from 'mongoose';

import {
  connectDB,
  type Order,
  type Product,
  ProductModel,
  type StockMovement,
  StockMovementModel,
  withTransaction,
} from '@/database';
import type { Paginated, StockMovementDTO } from '@/types';
import {
  ADMIN_PAGE_SIZE,
  DEFAULT_BUSINESS_SLUG,
  type StockMovementType,
} from '@lib/constants';
import { AppError } from '@lib/errors';
import type { StockAdjustmentOutput } from '@lib/validators/management';

import { toStockMovement } from './mappers';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Manual Stock In / Stock Out from the Product Table or Inventory page.
 * Uses an atomic conditional update so concurrent adjustments cannot produce
 * negative stock, and always records a StockMovement audit entry.
 */
export async function adjustProductStock(
  input: StockAdjustmentOutput,
  performedBy: string,
): Promise<{ stockQuantity: number; stockStatus: Product['stockStatus'] }> {
  await connectDB();

  return withTransaction(async (session) => {
    const qty = input.quantity;
    const isIn = input.type === 'stock_in';

    const updated = isIn
      ? await ProductModel.findOneAndUpdate(
          { _id: input.productId },
          [
            {
              $set: {
                stockQuantity: { $add: [{ $ifNull: ['$stockQuantity', 0] }, qty] },
                trackInventory: true,
                stockStatus: {
                  $cond: [
                    { $eq: ['$stockStatus', 'out_of_stock'] },
                    'in_stock',
                    '$stockStatus',
                  ],
                },
              },
            },
          ],
          { returnDocument: 'after', session, updatePipeline: true },
        ).lean()
      : await ProductModel.findOneAndUpdate(
          {
            _id: input.productId,
            stockQuantity: { $gte: qty },
          },
          [
            {
              $set: {
                stockQuantity: { $subtract: [{ $ifNull: ['$stockQuantity', 0] }, qty] },
                trackInventory: true,
                stockStatus: {
                  $cond: [
                    { $lte: [{ $subtract: [{ $ifNull: ['$stockQuantity', 0] }, qty] }, 0] },
                    'out_of_stock',
                    '$stockStatus',
                  ],
                },
              },
            },
          ],
          { returnDocument: 'after', session, updatePipeline: true },
        ).lean();

    if (!updated) {
      const exists = await ProductModel.findById(input.productId, 'name stockQuantity')
        .session(session ?? null)
        .lean();
      if (!exists) throw new AppError('Product not found.', 404);
      throw new AppError(
        `Insufficient stock for ${exists.name}. Available: ${exists.stockQuantity ?? 0}.`,
      );
    }

    const newQuantity = updated.stockQuantity ?? 0;
    const previousQuantity = isIn ? newQuantity - qty : newQuantity + qty;
    const when = input.date ? new Date(input.date) : new Date();

    await StockMovementModel.create(
      [
        {
          product: updated._id,
          productName: updated.name,
          business: updated.business || DEFAULT_BUSINESS_SLUG,
          type: input.type,
          quantity: qty,
          previousQuantity,
          newQuantity,
          reason: input.reason,
          notes: input.notes,
          date: Number.isNaN(when.getTime()) ? new Date() : when,
          performedBy,
        },
      ],
      { session },
    );

    return { stockQuantity: newQuantity, stockStatus: updated.stockStatus };
  });
}

/**
 * Deducts stock for order items whose products have `trackInventory: true`.
 * Runs inside the caller's session/transaction.
 */
export async function deductOrderStock(
  order: Pick<Order, '_id' | 'orderNumber' | 'business' | 'items'>,
  performedBy: string | null,
  session?: ClientSession,
): Promise<boolean> {
  let anyTracked = false;
  for (const item of order.items) {
    const product = await ProductModel.findById(
      item.product,
      'name trackInventory stockQuantity business',
    )
      .session(session ?? null)
      .lean();
    if (!product || !product.trackInventory) continue;

    anyTracked = true;
    const updated = await ProductModel.findOneAndUpdate(
      { _id: product._id, stockQuantity: { $gte: item.quantity } },
      [
        {
          $set: {
            stockQuantity: { $subtract: ['$stockQuantity', item.quantity] },
            stockStatus: {
              $cond: [
                { $lte: [{ $subtract: ['$stockQuantity', item.quantity] }, 0] },
                'out_of_stock',
                '$stockStatus',
              ],
            },
          },
        },
      ],
      { returnDocument: 'after', session, updatePipeline: true },
    ).lean();

    if (!updated) {
      throw new AppError(
        `Insufficient stock for "${product.name}". Available: ${product.stockQuantity ?? 0}, requested: ${item.quantity}.`,
      );
    }

    const newQty = updated.stockQuantity ?? 0;
    await StockMovementModel.create(
      [
        {
          product: product._id,
          productName: product.name,
          business: order.business || DEFAULT_BUSINESS_SLUG,
          type: 'order_out',
          quantity: item.quantity,
          previousQuantity: newQty + item.quantity,
          newQuantity: newQty,
          reason: `Order ${order.orderNumber}`,
          orderId: order._id,
          orderNumber: order.orderNumber,
          date: new Date(),
          performedBy,
        },
      ],
      { session },
    );
  }
  return anyTracked;
}

/**
 * Restores stock for an order or specific returned items.
 */
export async function restoreOrderStock(
  order: Pick<Order, '_id' | 'orderNumber' | 'business'>,
  items: { productId: string; quantity: number }[],
  type: Extract<StockMovementType, 'order_cancel' | 'order_return'>,
  performedBy: string | null,
  session?: ClientSession,
): Promise<void> {
  for (const item of items) {
    if (item.quantity <= 0) continue;
    const product = await ProductModel.findById(
      item.productId,
      'name trackInventory stockQuantity',
    )
      .session(session ?? null)
      .lean();
    if (!product || !product.trackInventory) continue;

    const updated = await ProductModel.findOneAndUpdate(
      { _id: product._id },
      [
        {
          $set: {
            stockQuantity: { $add: [{ $ifNull: ['$stockQuantity', 0] }, item.quantity] },
            stockStatus: {
              $cond: [
                { $eq: ['$stockStatus', 'out_of_stock'] },
                'in_stock',
                '$stockStatus',
              ],
            },
          },
        },
      ],
      { returnDocument: 'after', session, updatePipeline: true },
    ).lean();

    if (!updated) continue;
    const newQty = updated.stockQuantity ?? 0;
    await StockMovementModel.create(
      [
        {
          product: product._id,
          productName: product.name,
          business: order.business || DEFAULT_BUSINESS_SLUG,
          type,
          quantity: item.quantity,
          previousQuantity: Math.max(0, newQty - item.quantity),
          newQuantity: newQty,
          reason:
            type === 'order_cancel'
              ? `Order ${order.orderNumber} cancelled`
              : `Order ${order.orderNumber} returned`,
          orderId: order._id,
          orderNumber: order.orderNumber,
          date: new Date(),
          performedBy,
        },
      ],
      { session },
    );
  }
}

export type StockMovementFilters = {
  q?: string;
  productId?: string;
  business?: string;
  type?: StockMovementType;
  page?: number;
};

export async function listStockMovements(
  f: StockMovementFilters,
): Promise<Paginated<StockMovementDTO>> {
  await connectDB();
  const page = Math.max(1, f.page ?? 1);
  const query: QueryFilter<StockMovement> = {};

  if (f.q) {
    const rx = new RegExp(escapeRegex(f.q.trim().slice(0, 80)), 'i');
    query.$or = [{ productName: rx }, { reason: rx }, { orderNumber: rx }];
  }
  if (f.productId) query.product = f.productId;
  if (f.business && f.business !== 'all') {
    query.business =
      f.business === DEFAULT_BUSINESS_SLUG
        ? { $in: [DEFAULT_BUSINESS_SLUG, null] }
        : f.business;
  }
  if (f.type) query.type = f.type;

  const [docs, total] = await Promise.all([
    StockMovementModel.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE)
      .populate('performedBy', 'name')
      .lean(),
    StockMovementModel.countDocuments(query),
  ]);

  return {
    items: docs.map((d) => toStockMovement(d as never)),
    total,
    page,
    pageSize: ADMIN_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}
