import 'server-only';

import { Types } from 'mongoose';
import { z } from 'zod';

import { ORDER_TRANSITIONS } from '@lib/business/orders';
import { sellerBasePrice } from '@lib/business/pricing';
import { AppError } from '@lib/errors';
import { customerSchema } from '@lib/validators/reseller';

import type { OrderStatus } from '@/types/platform';

import { nextId, withTransaction } from '../db';
import { objectId, serverT } from '../http';
import { OrderModel, ProductModel } from '../models';
import { notify } from './notify';
import { getSettings } from './settings';
import { createPendingEarning, credit, debit, ledger } from './wallet';

export const placeOrderSchema = z.object({
  productId: objectId,
  quantity: z.coerce.number().int().min(1).max(50),
  sellingPrice: z.coerce.number().int().min(1),
  customer: customerSchema(serverT),
});

/**
 * Places an order for a seller. Never trusts the client: base price, delivery
 * and packaging charges come from the product + settings. The wallet is
 * debited once, atomically, inside the same transaction that creates the
 * order and its two ledger entries.
 */
export async function placeOrder(
  seller: { id: string; name: string },
  input: z.output<typeof placeOrderSchema>,
) {
  const product = await ProductModel.findById(input.productId).lean();
  if (!product || product.status !== 'active' || product.availability === 'out_of_stock') {
    throw new AppError('This product is not available right now.', 409);
  }
  const base = sellerBasePrice(product);
  if (input.sellingPrice < base) {
    throw new AppError(`Selling price must be at least the base price (৳${base}).`, 422);
  }
  const settings = await getSettings();
  const { area, note, altPhone, ...customer } = input.customer;
  const deliveryCharge = settings.deliveryCharges[area] + (product.deliveryCharge ?? 0);
  const packagingCharge = product.packagingCharge ?? 0;

  const order = await withTransaction(async (session) => {
    await debit(seller.id, deliveryCharge + packagingCharge, session);
    const orderNo = await nextId('ORD', 10000);
    const n = orderNo.split('-')[1];
    const now = new Date();
    const [doc] = await OrderModel.create(
      [
        {
          orderNo,
          invoiceNo: `INV-${now.getFullYear()}-${n}`,
          sellerId: new Types.ObjectId(seller.id),
          productId: product._id,
          productName: product.name,
          quantity: input.quantity,
          basePrice: base,
          supplierCost: product.supplierCost,
          platformMargin: product.platformMargin,
          sellingPrice: input.sellingPrice,
          deliveryCharge,
          packagingCharge,
          customer: { ...customer, altPhone: altPhone || undefined, area },
          status: 'placed',
          history: [{ status: 'placed', at: now }],
          note: note || undefined,
        },
      ],
      { session },
    );
    const ref = { orderId: doc!._id, orderNo };
    await ledger({ sellerId: seller.id, type: 'delivery_charge', amount: -deliveryCharge, description: `Delivery charge · ${orderNo}`, ...ref }, session);
    await ledger({ sellerId: seller.id, type: 'packaging_charge', amount: -packagingCharge, description: `Packaging charge · ${orderNo}`, ...ref }, session);
    return doc!;
  });

  await notify({ audience: 'admin', kind: 'order', title: `New order ${order.orderNo}`, body: `${seller.name} placed an order for ${product.name}.`, href: `/admin/orders/${order.orderNo}` });
  return order;
}

export const orderStatusSchema = z.object({
  status: z.enum(['placed', 'processing', 'confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned']),
  note: z.string().trim().max(300).optional(),
  courier: z.string().trim().max(60).optional(),
  trackingCode: z.string().trim().max(60).optional(),
});

/** Admin status change with the side effects each transition carries. */
export async function updateOrderStatus(orderNo: string, input: z.output<typeof orderStatusSchema>) {
  const next = input.status as OrderStatus;
  const updated = await withTransaction(async (session) => {
    const order = await OrderModel.findOne({ orderNo }).session(session ?? null);
    if (!order) throw new AppError('Order not found.', 404);
    const from = order.status as OrderStatus;
    if (!ORDER_TRANSITIONS[from].includes(next)) {
      throw new AppError(`An order that is ${from.replace(/_/g, ' ')} cannot become ${next.replace(/_/g, ' ')}.`, 409);
    }
    const now = new Date();
    const set: Record<string, unknown> = { status: next };
    if (next === 'shipped') {
      set.courier = input.courier || order.courier || 'Steadfast';
      set.trackingCode = input.trackingCode || order.trackingCode || `TRK${Math.floor(100000 + Math.random() * 899999)}`;
    }
    if (next === 'delivered') set.deliveredAt = now;
    // Conditional on the status we read, so two admins can't apply side effects twice.
    const doc = await OrderModel.findOneAndUpdate(
      { _id: order._id, status: from },
      { $set: set, $push: { history: { status: next, at: now, note: input.note } } },
      { session, new: true },
    );
    if (!doc) throw new AppError('This order was just updated. Refresh and try again.', 409);

    const sellerId = String(doc.sellerId);
    if (next === 'delivered') await createPendingEarning(doc, now, session);
    if (next === 'cancelled') {
      const refund = doc.deliveryCharge + doc.packagingCharge;
      await credit(sellerId, refund, session);
      await ledger({ sellerId, type: 'refund', amount: refund, description: `Charges refunded · ${orderNo} cancelled`, orderId: doc._id, orderNo }, session);
    }
    await notify(
      { audience: 'seller', sellerId, kind: 'status', title: `Order ${orderNo} is ${next.replace(/_/g, ' ')}`, body: `${doc.productName} × ${doc.quantity} for ${doc.customer!.name}.`, href: `/seller/orders/${orderNo}` },
      session,
    );
    return doc;
  });
  return updated;
}
