import 'server-only';

import type { QueryFilter, Types } from 'mongoose';

import {
  connectDB,
  type Order,
  OrderModel,
  ProductModel,
  SupplierModel,
  SupplierOrderModel,
} from '@/database';
import type { Paginated, SupplierOrderDTO } from '@/types';
import { ADMIN_PAGE_SIZE, type SupplierOrderStatus } from '@lib/constants';
import { AppError } from '@lib/errors';
import { normalizeBDPhone } from '@lib/phone';

import { recordSystemExpense } from './expenses';
import { toSupplierOrder } from './mappers';
import { getSupplierAdapter } from './suppliers/registry';

function isInsideDhaka(division?: string, district?: string): boolean {
  const div = (division ?? '').trim().toLowerCase();
  const dist = (district ?? '').trim().toLowerCase();
  return dist === 'dhaka' || (div === 'dhaka' && !dist);
}

/**
 * Distribute an order-level discount across items proportionally by `lineTotal`
 * so each item's net selling price reflects any coupon/promo discount.
 */
export function computeDiscountedItemPrices(
  items: ReadonlyArray<{ id: string; lineTotal: number }>,
  subtotal: number,
  discount: number,
): Map<string, { lineTotal: number; netSellingPrice: number }> {
  const result = new Map<string, { lineTotal: number; netSellingPrice: number }>();
  const cappedDiscount = subtotal > 0 ? Math.max(0, Math.min(discount, subtotal)) : 0;
  let remainingDiscount = cappedDiscount;

  items.forEach((item, index) => {
    let itemDiscount = 0;
    if (remainingDiscount > 0 && subtotal > 0) {
      itemDiscount =
        index === items.length - 1
          ? Math.min(item.lineTotal, remainingDiscount)
          : Math.min(
              item.lineTotal,
              remainingDiscount,
              Math.round((cappedDiscount * item.lineTotal) / subtotal),
            );
      remainingDiscount -= itemDiscount;
    }
    result.set(item.id, {
      lineTotal: item.lineTotal,
      netSellingPrice: Math.max(0, item.lineTotal - itemDiscount),
    });
  });

  return result;
}

function matchVariant(
  supplierVariants:
    | {
        externalVariantId: string;
        color?: string | null;
        size?: string | null;
        stockQuantity: number;
        inStock: boolean;
      }[]
    | undefined,
  selected: Record<string, string> | Map<string, string> | undefined,
): { externalVariantId: string; label: string } | null {
  if (!supplierVariants?.length) return null;
  const entries: Record<string, string> =
    selected instanceof Map ? Object.fromEntries(selected.entries()) : (selected ?? {});
  const chosenColor = (entries.Color ?? entries.color ?? '').trim().toLowerCase();
  const chosenSize = (entries.Size ?? entries.size ?? '').trim().toLowerCase();

  const match = supplierVariants.find((v) => {
    const vc = (v.color ?? '').trim().toLowerCase();
    const vs = (v.size ?? '').trim().toLowerCase();
    const colorOk = !vc || !chosenColor || vc === chosenColor;
    const sizeOk = !vs || !chosenSize || vs === chosenSize;
    return colorOk && sizeOk && (Boolean(chosenColor && vc) || Boolean(chosenSize && vs));
  });

  if (!match) return null;
  const label = [match.color, match.size].filter(Boolean).join(' / ') || match.externalVariantId;
  return { externalVariantId: match.externalVariantId, label };
}

/**
 * Creates `awaiting_confirmation` SupplierOrder records for any items in a
 * newly created order that belong to an API-connected supplier.
 * NEVER sends orders automatically to the supplier API.
 */
export async function createSupplierOrdersForOrder(order: Order): Promise<void> {
  await connectDB();
  const productIds = [...new Set(order.items.map((i) => i.product))];
  if (!productIds.length) return;

  const products = await ProductModel.find({
    _id: { $in: productIds },
    supplierProductId: { $exists: true, $ne: null },
  }).lean();
  if (!products.length) return;

  const supplierIds = [
    ...new Set(
      products.map((p) => p.supplier).filter((s): s is Types.ObjectId => Boolean(s)),
    ),
  ];
  const suppliers = await SupplierModel.find({
    _id: { $in: supplierIds },
    type: 'api',
  }).lean();
  const supplierById = new Map(suppliers.map((s) => [String(s._id), s]));
  const productById = new Map(products.map((p) => [String(p._id), p]));

  const insideDhaka = isInsideDhaka(
    order.shippingAddress.division,
    order.shippingAddress.city,
  );
  const orderShippingFee = order.shippingFee ?? 0;
  const itemPrices = computeDiscountedItemPrices(
    order.items.map((i) => ({ id: String(i._id), lineTotal: i.lineTotal })),
    order.subtotal,
    order.discount ?? 0,
  );
  let remainingShippingToAllocate = orderShippingFee;

  for (const item of order.items) {
    const product = productById.get(String(item.product));
    if (!product?.supplierProductId || !product.supplier) continue;
    const supplier = supplierById.get(String(product.supplier));
    if (!supplier) continue;

    const matched = matchVariant(product.supplierVariants, item.variant);
    const deliveryCharge = insideDhaka
      ? (product.supplierDeliveryCharges?.insideDhaka ??
        supplier.deliveryCharges?.insideDhaka ??
        70)
      : (product.supplierDeliveryCharges?.outsideDhaka ??
        supplier.deliveryCharges?.outsideDhaka ??
        130);
    const deliveryPaidByCustomer = orderShippingFee >= deliveryCharge && deliveryCharge > 0;
    const deliveryPaidUpfront = deliveryPaidByCustomer && order.paymentStatus === 'paid';
    const costPrice = product.supplierPrice * item.quantity;
    const packagingCost = (product.supplierPackagingCost ?? 0) * item.quantity;
    const baseSellingPrice =
      itemPrices.get(String(item._id))?.netSellingPrice ?? item.lineTotal;
    // When a partial delivery discount was given (0 < shippingFee < deliveryCharge),
    // reseller pays deliveryCharge on Business Koro and collects the discounted shippingFee
    // inside sellingPrice so the customer pays the exact checkout total.
    const allocatedShipping =
      !deliveryPaidByCustomer && remainingShippingToAllocate > 0
        ? remainingShippingToAllocate
        : 0;
    if (allocatedShipping > 0) remainingShippingToAllocate = 0;
    const sellingPrice = baseSellingPrice + allocatedShipping;
    const expectedProfit =
      sellingPrice - costPrice - packagingCost - (deliveryPaidByCustomer ? 0 : deliveryCharge);

    await SupplierOrderModel.updateOne(
      { order: order._id, orderItemId: item._id },
      {
        $setOnInsert: {
          order: order._id,
          orderNumber: order.orderNumber,
          orderItemId: item._id,
          product: product._id,
          productName: item.name,
          supplier: supplier._id,
          supplierName: supplier.name,
          supplierProvider: supplier.provider,
          externalProductId: product.supplierProductId,
          externalVariantId: matched?.externalVariantId,
          variantLabel: matched?.label,
          quantity: item.quantity,
          customer: {
            name: order.customer.name,
            phone: order.customer.phone,
            address: order.shippingAddress.addressLine,
            division: order.shippingAddress.division || 'Dhaka',
            district: order.shippingAddress.city,
            area: order.shippingAddress.area || order.shippingAddress.city,
          },
          customerNote: order.customerNote,
          sellingPrice,
          costPrice,
          packagingCost,
          deliveryCharge,
          deliveryChargePaidByCustomer: deliveryPaidByCustomer,
          deliveryChargePaidUpfront: deliveryPaidUpfront,
          expectedProfit,
          status: 'awaiting_confirmation',
          statusHistory: [
            {
              status: 'awaiting_confirmation',
              note: 'Order placed locally. Waiting for manual admin confirmation before sending to supplier.',
              at: new Date(),
            },
          ],
        },
      },
      { upsert: true },
    );
  }
}

export async function listSupplierOrdersForOrder(orderId: string): Promise<SupplierOrderDTO[]> {
  await connectDB();
  const docs = await SupplierOrderModel.find({ order: orderId })
    .populate('confirmedBy', 'name')
    .sort({ createdAt: 1 })
    .lean();
  return docs.map((d) => toSupplierOrder(d as never));
}

export async function listAllSupplierOrders(filters: {
  status?: SupplierOrderStatus;
  supplierId?: string;
  q?: string;
  page?: number;
}): Promise<Paginated<SupplierOrderDTO>> {
  await connectDB();
  const page = Math.max(1, filters.page ?? 1);
  const query: QueryFilter<Record<string, unknown>> = {};
  if (filters.status) query.status = filters.status;
  if (filters.supplierId) query.supplier = filters.supplierId;
  if (filters.q?.trim()) {
    const rx = new RegExp(filters.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { orderNumber: rx },
      { externalOrderId: rx },
      { productName: rx },
      { 'customer.name': rx },
      { 'customer.phone': rx },
    ];
  }

  const [docs, total] = await Promise.all([
    SupplierOrderModel.find(query)
      .populate('confirmedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE)
      .lean(),
    SupplierOrderModel.countDocuments(query),
  ]);

  return {
    items: docs.map((d) => toSupplierOrder(d as never)),
    total,
    page,
    pageSize: ADMIN_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}

export type ConfirmSupplierOrderInput = {
  supplierOrderId: string;
  adminId: string;
  sellingPrice: number;
  externalVariantId?: string;
  deliveryChargePaidByCustomer: boolean;
  deliveryChargePaidUpfront?: boolean;
  customerNote?: string;
  allowDuplicate?: boolean;
};

export async function confirmAndSendSupplierOrder(
  input: ConfirmSupplierOrderInput,
): Promise<SupplierOrderDTO> {
  await connectDB();

  // Atomic lock prevents duplicate submissions on double-click or concurrent retries.
  const locked = await SupplierOrderModel.findOneAndUpdate(
    {
      _id: input.supplierOrderId,
      submitting: { $ne: true },
      status: { $in: ['awaiting_confirmation', 'failed'] },
    },
    { $set: { submitting: true } },
    { returnDocument: 'after' },
  );

  if (!locked) {
    const existing = await SupplierOrderModel.findById(input.supplierOrderId).lean();
    if (!existing) throw new AppError('Supplier order record not found.', 404);
    if (existing.submitting) {
      throw new AppError('This supplier order is currently being submitted. Please wait.', 409);
    }
    throw new AppError(
      `This supplier order has already been processed (${existing.status}).`,
      409,
    );
  }

  const releaseLock = async () => {
    await SupplierOrderModel.findByIdAndUpdate(locked._id, { $set: { submitting: false } });
  };

  try {
    const [supplier, product] = await Promise.all([
      SupplierModel.findById(locked.supplier).lean(),
      ProductModel.findById(locked.product).lean(),
    ]);
    if (!supplier || supplier.type !== 'api' || !supplier.provider) {
      throw new AppError('API-connected supplier not found or inactive.', 400);
    }
    if (!product) throw new AppError('Linked local product not found.', 404);

    // Phone normalization & validation
    const normalizedPhone = normalizeBDPhone(locked.customer.phone);
    if (!normalizedPhone) {
      throw new AppError(
        `Invalid Bangladeshi phone number (${locked.customer.phone}). Expected 01XXXXXXXXX.`,
        400,
      );
    }

    // Variant validation if product has variants
    const variantId = input.externalVariantId?.trim() || locked.externalVariantId;
    let variantLabel = locked.variantLabel;
    if (product.supplierVariants && product.supplierVariants.length > 0) {
      if (!variantId) {
        throw new AppError('Please select a supplier product variant before sending.', 400);
      }
      const chosen = product.supplierVariants.find((v) => v.externalVariantId === variantId);
      if (!chosen) {
        throw new AppError('Selected supplier variant does not match this product.', 400);
      }
      if (!chosen.inStock) {
        throw new AppError('Selected supplier variant is currently out of stock.', 400);
      }
      variantLabel = [chosen.color, chosen.size].filter(Boolean).join(' / ') || variantId;
    }

    // Pricing & profitability validation
    const insideDhaka = isInsideDhaka(locked.customer.division, locked.customer.district);
    const deliveryCharge = insideDhaka
      ? (product.supplierDeliveryCharges?.insideDhaka ??
        supplier.deliveryCharges?.insideDhaka ??
        70)
      : (product.supplierDeliveryCharges?.outsideDhaka ??
        supplier.deliveryCharges?.outsideDhaka ??
        130);
    const costPrice = (product.supplierPrice ?? locked.costPrice / locked.quantity) * locked.quantity;
    const packagingCost =
      (product.supplierPackagingCost ?? locked.packagingCost / locked.quantity) * locked.quantity;

    const minRules = product.supplierMinSellingPrice;
    const requiredMinUnit = minRules
      ? input.deliveryChargePaidByCustomer
        ? minRules.customerPaysDelivery
        : insideDhaka
          ? minRules.resellerPaysDeliveryInsideDhaka
          : minRules.resellerPaysDeliveryOutsideDhaka
      : 0;
    const requiredMinTotal = requiredMinUnit * locked.quantity;

    if (input.sellingPrice <= costPrice) {
      throw new AppError(
        `Selling price (৳${input.sellingPrice}) must be greater than supplier cost price (৳${costPrice}).`,
        400,
      );
    }
    if (requiredMinTotal > 0 && input.sellingPrice < requiredMinTotal) {
      throw new AppError(
        `Selling price (৳${input.sellingPrice}) violates supplier minimum selling price rule (minimum ৳${requiredMinTotal}).`,
        400,
      );
    }

    const expectedProfit =
      input.sellingPrice -
      costPrice -
      packagingCost -
      (input.deliveryChargePaidByCustomer ? 0 : deliveryCharge);

    const adapter = getSupplierAdapter(supplier.provider);
    const result = await adapter.submitOrder(supplier, {
      productId: locked.externalProductId,
      variantId,
      quantity: locked.quantity,
      customerName: locked.customer.name,
      customerPhone: normalizedPhone,
      customerAddress: locked.customer.address,
      customerDivision: locked.customer.division,
      customerDistrict: locked.customer.district,
      customerArea: locked.customer.area,
      sellingPrice: input.sellingPrice,
      deliveryChargePaidByCustomer: input.deliveryChargePaidByCustomer,
      deliveryChargePaidUpfront: Boolean(
        input.deliveryChargePaidByCustomer && input.deliveryChargePaidUpfront,
      ),
      customerNote: input.customerNote ?? locked.customerNote,
      allowDuplicate: Boolean(input.allowDuplicate),
    });

    const now = new Date();
    locked.sellingPrice = input.sellingPrice;
    locked.costPrice = costPrice;
    locked.packagingCost = packagingCost;
    locked.deliveryCharge = deliveryCharge;
    locked.deliveryChargePaidByCustomer = input.deliveryChargePaidByCustomer;
    locked.deliveryChargePaidUpfront = Boolean(
      input.deliveryChargePaidByCustomer && input.deliveryChargePaidUpfront,
    );
    locked.expectedProfit = expectedProfit;
    locked.externalVariantId = variantId;
    locked.variantLabel = variantLabel;
    locked.customerNote = input.customerNote ?? locked.customerNote;
    locked.allowDuplicate = Boolean(input.allowDuplicate);
    locked.status = result.status;
    locked.externalOrderId = result.externalOrderId ?? locked.externalOrderId;
    locked.externalStatus = result.externalStatus;
    locked.paymentStatus = result.paymentStatus;
    locked.isDuplicate = result.isDuplicate;
    locked.confirmedBy = input.adminId as never;
    locked.confirmedAt = now;
    locked.submittedAt = now;
    locked.lastSyncedAt = now;
    locked.lastError = undefined;
    locked.lastResponseSummary = result.rawSummary;
    locked.submitting = false;
    locked.statusHistory.push({
      status: result.status,
      note: result.isDuplicate
        ? `Duplicate order returned by supplier (ID: ${result.externalOrderId ?? '—'}).`
        : result.status === 'pending_payment'
          ? 'Submitted to supplier — awaiting supplier payment / balance.'
          : `Confirmed and submitted to ${supplier.name} (ID: ${result.externalOrderId ?? '—'}).`,
      at: now,
      by: input.adminId as never,
    });

    await locked.save();
    if (packagingCost > 0) {
      const orderDoc = await OrderModel.findById(locked.order).select('business').lean();
      await recordSystemExpense({
        categorySlug: 'packaging-cost',
        title: `Packaging charge — ${locked.orderNumber}`,
        amount: packagingCost,
        description: `Supplier packaging cost for ${locked.productName} × ${locked.quantity} (${supplier.name}).`,
        business: orderDoc?.business,
        createdBy: input.adminId,
      });
    }
    const populated = await SupplierOrderModel.findById(locked._id)
      .populate('confirmedBy', 'name')
      .lean();
    return toSupplierOrder(populated as never);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Supplier order submission failed.';
    // Only mark `failed` if it wasn't a pre-flight validation error (or record error safely).
    locked.submitting = false;
    locked.status = 'failed';
    locked.lastError = message.slice(0, 2000);
    locked.statusHistory.push({
      status: 'failed',
      note: message.slice(0, 500),
      at: new Date(),
      by: input.adminId as never,
    });
    await locked.save().catch(releaseLock);
    throw err;
  }
}

export async function refreshSupplierOrderStatus(
  supplierOrderId: string,
  adminId?: string,
): Promise<SupplierOrderDTO> {
  await connectDB();
  const doc = await SupplierOrderModel.findById(supplierOrderId);
  if (!doc) throw new AppError('Supplier order record not found.', 404);
  if (!doc.externalOrderId) {
    throw new AppError('This order has not been assigned a supplier order ID yet.', 400);
  }

  const supplier = await SupplierModel.findById(doc.supplier).lean();
  if (!supplier || supplier.type !== 'api' || !supplier.provider) {
    throw new AppError('API supplier configuration not found.', 400);
  }

  const adapter = getSupplierAdapter(supplier.provider);
  const res = await adapter.getOrderStatus(supplier, doc.externalOrderId);
  const now = new Date();
  const changed = doc.status !== res.status || doc.externalStatus !== res.externalStatus;

  doc.status = res.status;
  doc.externalStatus = res.externalStatus;
  doc.paymentStatus = res.paymentStatus;
  doc.lastSyncedAt = now;
  doc.lastResponseSummary = res.rawSummary;
  doc.lastError = undefined;
  if (changed) {
    doc.statusHistory.push({
      status: res.status,
      note: `Status synced from ${supplier.name}: ${res.externalStatus ?? res.status}`,
      at: now,
      by: adminId ? (adminId as never) : undefined,
    });
  }
  await doc.save();

  const populated = await SupplierOrderModel.findById(doc._id)
    .populate('confirmedBy', 'name')
    .lean();
  return toSupplierOrder(populated as never);
}
