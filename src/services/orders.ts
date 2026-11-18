import 'server-only';

import type { QueryFilter, Types } from 'mongoose';

import {
  AddressModel,
  BusinessModel,
  connectDB,
  nextSequence,
  type Order,
  type OrderItem,
  OrderModel,
  ProductModel,
  ReturnRequestModel,
  type Supplier,
  UserModel,
  withTransaction,
} from '@/database';
import type { CartQuote, CartQuoteLine, OrderDTO, OrderRowDTO, Paginated } from '@/types';
import {
  ADMIN_ORDER_TRANSITIONS,
  ADMIN_PAGE_SIZE,
  CUSTOMER_CANCELLABLE_STATUSES,
  DEFAULT_BUSINESS_SLUG,
  ORDER_STATUS_LABELS,
  type OrderPlatform,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
  RETURN_WINDOW_HOURS,
  type ShippingZone,
} from '@lib/constants';
import { AppError } from '@lib/errors';
import { signOrderPaymentToken } from '@lib/payments/paymently';
import type { CartLineInput } from '@lib/validators/order';

import { calculateCampaignDiscount } from './campaigns';
import { ensureDefaultExpenseCategories, recordSystemExpense } from './expenses';
import { deductOrderStock,restoreOrderStock } from './inventory';
import { toImage, toOrder, toReturn } from './mappers';
import {
  notifyAdminsOrderCancelled,
  notifyAdminsOrderPlaced,
  notifyCustomerOrderStatus,
} from './notifications';
import { getSettings } from './settings';
import { createSupplierOrdersForOrder } from './supplier-orders';

/* ─── Pricing ────────────────────────────────────────────────────────────── */

type PricedLine = CartQuoteLine & { item?: Omit<OrderItem, '_id'> };

/**
 * Prices cart lines from the database — the client's prices are never
 * trusted. Each line reports whether it can be ordered and, if not, why.
 */
async function priceLines(
  lines: CartLineInput[],
  {
    includeDrafts = false,
    includePrivate = false,
    business,
  }: { includeDrafts?: boolean; includePrivate?: boolean; business?: string } = {},
): Promise<PricedLine[]> {
  await connectDB();
  const ids = [...new Set(lines.map((l) => l.productId))];
  const products = await ProductModel.find({
    _id: { $in: ids },
    ...(includeDrafts ? {} : { status: 'published' }),
    ...(includePrivate
      ? {}
      : {
          visibility: { $ne: 'private' },
          business: { $in: [DEFAULT_BUSINESS_SLUG, null] as unknown as string[] },
        }),
  })
    .populate<{ supplier: Supplier | null }>('supplier', 'name')
    .populate<{
      comboItems: {
        product: {
          _id: Types.ObjectId;
          name: string;
          stockStatus: string;
          supplierProductUrl?: string;
          supplier: Supplier | null;
        } | null;
        quantity: number;
      }[];
    }>({
      path: 'comboItems.product',
      select: 'name stockStatus supplierProductUrl supplier',
      populate: { path: 'supplier', select: 'name' },
    })
    .lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  return lines.map((line) => {
    const p = byId.get(line.productId);
    if (!p) {
      return {
        productId: line.productId,
        name: 'Unavailable product',
        slug: '',
        variant: line.variant,
        options: [],
        quantity: line.quantity,
        unitPrice: 0,
        lineTotal: 0,
        available: false,
        issue: 'This product is no longer available.',
      };
    }

    // Keep only known options; every option must have a valid selection.
    const variant: Record<string, string> = {};
    let issue: string | undefined;
    const options = p.variations
      .filter((x) => x.values.length)
      .map((x) => ({ name: x.name, values: [...x.values] }));
    for (const v of options) {
      const chosen = line.variant[v.name];
      if (!chosen || !v.values.includes(chosen)) issue = `Please choose a ${v.name}.`;
      else variant[v.name] = chosen;
    }
    if (p.stockStatus === 'out_of_stock') issue = 'This product is out of stock.';
    if (
      business &&
      (p.business || DEFAULT_BUSINESS_SLUG) !== business
    ) {
      issue = 'This product belongs to a different store.';
    }
    if (p.trackInventory && (p.stockQuantity ?? 0) < line.quantity) {
      issue =
        (p.stockQuantity ?? 0) <= 0
          ? 'This product is out of stock.'
          : `Only ${p.stockQuantity} left in stock.`;
    }
    // A combo is only available while every item in it is.
    const components = p.type === 'combo' ? p.comboItems : [];
    if (components.some((c) => !c.product || c.product.stockStatus === 'out_of_stock')) {
      issue = 'An item in this combo is out of stock.';
    }

    const unitPrice = p.effectivePrice;
    const lineTotal = unitPrice * line.quantity;
    const image = toImage(p.images[0]);
    return {
      productId: line.productId,
      name: p.name,
      slug: p.slug,
      image,
      variant,
      options,
      quantity: line.quantity,
      unitPrice,
      lineTotal,
      available: !issue,
      issue,
      item: {
        product: p._id,
        name: p.name,
        slug: p.slug,
        image: image?.url,
        sku: p.sku,
        variant,
        quantity: line.quantity,
        unitPrice,
        supplierPrice: p.supplierPrice,
        lineTotal,
        supplier: p.supplier?._id ?? null,
        supplierName: p.supplier?.name,
        supplierProductUrl: p.supplierProductUrl,
        components: components
          .filter((c) => c.product)
          .map((c) => ({
            product: c.product!._id,
            name: c.product!.name,
            quantity: c.quantity,
            supplierName: c.product!.supplier?.name,
            supplierProductUrl: c.product!.supplierProductUrl,
          })),
      },
    };
  });
}

async function shippingFor(zone: ShippingZone | undefined, subtotal: number) {
  const s = await getSettings();
  if (s.freeShippingThreshold > 0 && subtotal >= s.freeShippingThreshold) return 0;
  if (!zone) return 0;
  return zone === 'inside_dhaka' ? s.shippingFeeInsideDhaka : s.shippingFeeOutsideDhaka;
}

export async function quoteCart(
  lines: CartLineInput[],
  zone?: ShippingZone,
  couponCode?: string | null,
): Promise<CartQuote> {
  const priced = await priceLines(lines);
  const subtotal = priced.filter((l) => l.available).reduce((sum, l) => sum + l.lineTotal, 0);
  const shippingFee = await shippingFor(zone, subtotal);
  const { freeShippingThreshold } = await getSettings();
  const { discount, appliedCampaign, couponError } = await calculateCampaignDiscount(
    priced,
    couponCode,
  );
  return {
    lines: priced.map(({ item: _item, ...rest }) => rest),
    subtotal,
    shippingFee,
    discount,
    total: Math.max(0, subtotal - discount) + shippingFee,
    freeShippingThreshold,
    appliedCampaign,
    couponError,
  };
}

/* ─── Creating orders ────────────────────────────────────────────────────── */

type NewOrder = {
  business?: string;
  lines: CartLineInput[];
  userId: string | null;
  customer: { name: string; phone: string; email?: string };
  shippingAddress: Order['shippingAddress'];
  platform: OrderPlatform;
  paymentMethod?: PaymentMethod;
  status?: Extract<OrderStatus, 'pending' | 'confirmed'>;
  shippingFeeOverride?: number;
  discount?: number;
  couponCode?: string | null;
  campaignId?: string | null;
  customerNote?: string;
  adminNote?: string;
  createdBy?: string | null;
  includeDrafts?: boolean;
  includePrivate?: boolean;
};

async function createOrder(
  input: NewOrder,
): Promise<{ id: string; orderNumber: string; invoiceNumber: string; total: number }> {
  const business = input.business || DEFAULT_BUSINESS_SLUG;
  const priced = await priceLines(input.lines, {
    includeDrafts: input.includeDrafts,
    includePrivate: input.includePrivate,
    business,
  });
  const problem = priced.find((l) => !l.available);
  if (problem) throw new AppError(`${problem.name}: ${problem.issue}`);

  const items = priced.map((l) => l.item!);
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const shippingFee =
    input.shippingFeeOverride ?? (await shippingFor(input.shippingAddress.zone, subtotal));
  const discount = Math.min(input.discount ?? 0, subtotal + shippingFee);
  const supplierCost = items.reduce((s, i) => s + i.supplierPrice * i.quantity, 0);
  const status = input.status ?? 'pending';
  const now = new Date();

  const bizDoc = await BusinessModel.findOne({ slug: business }, 'invoicePrefix').lean();
  const invPrefix = bizDoc?.invoicePrefix || 'RFC';

  const created = await withTransaction(async (session) => {
    const seq = await nextSequence('order');
    const orderNumber = `RFC-${seq}`;
    const invoiceNumber = `INV-${invPrefix}-${seq}`;

    const [order] = await OrderModel.create(
      [
        {
          orderNumber,
          invoiceNumber,
          business,
          user: input.userId,
          customer: input.customer,
          shippingAddress: input.shippingAddress,
          items,
          subtotal,
          shippingFee,
          discount,
          couponCode: input.couponCode ?? null,
          campaignId: input.campaignId ?? null,
          total: subtotal + shippingFee - discount,
          supplierCost,
          paymentMethod: input.paymentMethod ?? 'cod',
          platform: input.platform,
          status,
          statusHistory: [
            { status: 'pending' as const, at: now, by: input.createdBy ?? input.userId },
            ...(status === 'confirmed'
              ? [{ status: 'confirmed' as const, at: now, by: input.createdBy }]
              : []),
          ],
          customerNote: input.customerNote,
          adminNote: input.adminNote,
          createdBy: input.createdBy ?? null,
          ...(status === 'confirmed' ? { confirmedAt: now } : {}),
        },
      ],
      { session },
    );
    if (!order) throw new AppError('Failed to create order.');

    const stockDeducted = await deductOrderStock(
      order,
      input.createdBy ?? input.userId ?? null,
      session,
    );
    if (stockDeducted) {
      await OrderModel.updateOne(
        { _id: order._id },
        { $set: { stockDeducted: true } },
        { session },
      );
    }

    await ProductModel.bulkWrite(
      items.map((i) => ({
        updateOne: { filter: { _id: i.product }, update: { $inc: { soldCount: i.quantity } } },
      })),
      { session },
    );

    return { id: String(order._id), orderNumber, invoiceNumber, total: order.total };
  });

  const savedOrder = await OrderModel.findById(created.id).lean();
  if (savedOrder) {
    await createSupplierOrdersForOrder(savedOrder);
  }
  return created;
}

export async function placeWebsiteOrder(input: {
  lines: CartLineInput[];
  userId: string | null;
  name: string;
  phone: string;
  email?: string;
  address: Order['shippingAddress'];
  paymentMethod?: PaymentMethod;
  couponCode?: string | null;
  customerNote?: string;
  saveAddress?: boolean;
}) {
  const priced = await priceLines(input.lines);
  const { discount, appliedCampaign, couponError } = await calculateCampaignDiscount(
    priced,
    input.couponCode,
  );
  if (input.couponCode?.trim() && couponError) {
    throw new AppError(couponError);
  }

  const result = await createOrder({
    lines: input.lines,
    userId: input.userId,
    customer: { name: input.name, phone: input.phone, email: input.email },
    shippingAddress: input.address,
    platform: 'website',
    paymentMethod: input.paymentMethod ?? 'cod',
    discount,
    couponCode: appliedCampaign?.couponCode ?? null,
    campaignId: appliedCampaign?.id ?? null,
    customerNote: input.customerNote,
  });
  await notifyAdminsOrderPlaced({
    _id: result.id,
    orderNumber: result.orderNumber,
    customer: { name: input.name },
    total: result.total,
  });

  if (input.userId && input.saveAddress) {
    const hasAny = await AddressModel.exists({ user: input.userId });
    await AddressModel.create({
      ...input.address,
      user: input.userId,
      label: 'Home',
      isDefault: !hasAny,
    });
  }
  return {
    ...result,
    paymentToken: signOrderPaymentToken(result.id, result.orderNumber),
  };
}

export async function createManualOrder(
  input: Omit<NewOrder, 'includeDrafts' | 'includePrivate'> & { createdBy: string },
) {
  await connectDB();
  if (input.userId && !(await UserModel.exists({ _id: input.userId }))) {
    throw new AppError('Selected customer account not found.');
  }
  return createOrder({ ...input, includeDrafts: true, includePrivate: true });
}

/* ─── Reading orders ─────────────────────────────────────────────────────── */

export type AdminOrderFilters = {
  q?: string;
  status?: OrderStatus;
  platform?: OrderPlatform;
  business?: string;
  from?: string;
  to?: string;
  page?: number;
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toRow(o: Order): OrderRowDTO {
  return {
    id: String(o._id),
    orderNumber: o.orderNumber,
    business: o.business || DEFAULT_BUSINESS_SLUG,
    customer: { name: o.customer.name, phone: o.customer.phone, email: o.customer.email },
    total: o.total,
    status: o.status,
    platform: o.platform,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    createdAt: new Date(o.createdAt).toISOString(),
    itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
    city: o.shippingAddress.city,
  };
}

export async function listAdminOrders(f: AdminOrderFilters): Promise<Paginated<OrderRowDTO>> {
  await connectDB();
  const page = Math.max(1, f.page ?? 1);
  const query: QueryFilter<Order> = {};
  if (f.q) {
    const rx = new RegExp(escapeRegex(f.q.trim().slice(0, 80)), 'i');
    query.$or = [{ orderNumber: rx }, { 'customer.name': rx }, { 'customer.phone': rx }];
  }
  if (f.status) query.status = f.status;
  if (f.platform) query.platform = f.platform;
  if (f.business && f.business !== 'all') {
    query.business =
      f.business === DEFAULT_BUSINESS_SLUG
        ? { $in: [DEFAULT_BUSINESS_SLUG, null] as unknown as string[] }
        : f.business;
  }
  if (f.from || f.to) {
    query.createdAt = {
      ...(f.from ? { $gte: new Date(f.from) } : {}),
      ...(f.to ? { $lte: new Date(`${f.to}T23:59:59.999`) } : {}),
    };
  }
  const [docs, total] = await Promise.all([
    OrderModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE)
      .lean(),
    OrderModel.countDocuments(query),
  ]);
  return {
    items: docs.map(toRow),
    total,
    page,
    pageSize: ADMIN_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}

export async function countOrdersByStatus(): Promise<Record<string, number>> {
  await connectDB();
  const rows = await OrderModel.aggregate<{ _id: string; n: number }>([
    { $group: { _id: '$status', n: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
}

export async function getAdminOrder(id: string): Promise<OrderDTO | null> {
  await connectDB();
  const [doc, ret] = await Promise.all([
    OrderModel.findById(id).populate('statusHistory.by', 'name').lean(),
    ReturnRequestModel.findOne({ order: id }).lean(),
  ]);
  if (!doc) return null;
  return {
    ...toOrder(doc, { admin: true }),
    returnRequest: ret ? toReturn({ ...ret, user: ret.user, order: ret.order }) : null,
  };
}

function withinReturnWindow(o: Order): boolean {
  if (!o.deliveredAt || !['delivered', 'completed'].includes(o.status)) return false;
  return Date.now() - new Date(o.deliveredAt).getTime() <= RETURN_WINDOW_HOURS * 3600 * 1000;
}

export async function listCustomerOrders(userId: string): Promise<OrderRowDTO[]> {
  await connectDB();
  const docs = await OrderModel.find({ user: userId }).sort({ createdAt: -1 }).limit(200).lean();
  return docs.map(toRow);
}

export async function getCustomerOrder(userId: string, id: string): Promise<OrderDTO | null> {
  await connectDB();
  const doc = await OrderModel.findOne({ _id: id, user: userId }).lean();
  if (!doc) return null;
  const ret = await ReturnRequestModel.findOne({ order: doc._id }).lean();
  return {
    ...toOrder(doc, { admin: false }),
    canCancel: CUSTOMER_CANCELLABLE_STATUSES.includes(doc.status),
    canRequestReturn: false,
    returnRequest: ret ? toReturn({ ...ret, user: ret.user, order: ret.order }) : null,
  };
}

/** Public tracking: order number + the phone it was placed with. */
export async function trackOrder(orderNumber: string, phone: string): Promise<OrderDTO | null> {
  await connectDB();
  const doc = await OrderModel.findOne({ orderNumber, 'customer.phone': phone }).lean();
  if (!doc) return null;
  const dto = toOrder(doc, { admin: false });
  // Tracking is unauthenticated — show progress, not full personal details.
  return {
    ...dto,
    userId: null,
    customer: { name: dto.customer.name.split(' ')[0] ?? '', phone: '' },
    shippingAddress: { ...dto.shippingAddress, addressLine: '', phone: '' },
  };
}

/** Minimal confirmation info shown right after checkout. */
export async function getOrderConfirmation(orderNumber: string) {
  await connectDB();
  const doc = await OrderModel.findOne(
    { orderNumber },
    'orderNumber total createdAt customer.name items.quantity status paymentMethod paymentStatus gatewayPaymentMethod paymentGateway',
  ).lean();
  if (!doc) return null;
  return {
    id: String(doc._id),
    orderNumber: doc.orderNumber,
    total: doc.total,
    firstName: doc.customer.name.split(' ')[0] ?? '',
    itemCount: doc.items.reduce((s, i) => s + i.quantity, 0),
    status: doc.status,
    paymentMethod: doc.paymentMethod,
    paymentStatus: doc.paymentStatus,
    gatewayPaymentMethod: doc.gatewayPaymentMethod ?? null,
    paymentGateway: doc.paymentGateway ?? null,
    paymentToken: signOrderPaymentToken(String(doc._id), doc.orderNumber),
  };
}

/* ─── Changing orders ────────────────────────────────────────────────────── */

async function revertSoldCounts(order: Order) {
  await ProductModel.bulkWrite(
    order.items.map((i) => ({
      updateOne: { filter: { _id: i.product }, update: { $inc: { soldCount: -i.quantity } } },
    })),
  );
}

export async function updateOrderStatus(
  orderId: string,
  next: OrderStatus,
  by: string,
  note?: string,
  opts?: {
    refundAmount?: number;
    returnItems?: { orderItemId: string; quantity: number; restock: boolean }[];
    customerPaidDelivery?: boolean;
    returnDeliveryExpenseAmount?: number;
  },
): Promise<void> {
  await connectDB();
  if (next === 'returned' && opts?.customerPaidDelivery === false) {
    await ensureDefaultExpenseCategories();
  }
  const updatedOrder = await withTransaction(async (session) => {
    const order = await OrderModel.findById(orderId).session(session ?? null);
    if (!order) throw new AppError('Order not found.', 404);
    if (!ADMIN_ORDER_TRANSITIONS[order.status].includes(next)) {
      throw new AppError(
        `Can't move an order from ${ORDER_STATUS_LABELS[order.status]} to ${ORDER_STATUS_LABELS[next]}.`,
      );
    }
    if (
      next === 'returned' &&
      (order.status === 'delivered' || order.status === 'completed') &&
      !withinReturnWindow(order)
    ) {
      throw new AppError(
        `Returns can only be processed within ${Math.round(RETURN_WINDOW_HOURS / 24)} days of delivery.`,
      );
    }

    const prevStatus = order.status;
    const now = new Date();
    order.status = next;
    order.statusHistory.push({ status: next, note, at: now, by: by as never });

    if (next === 'confirmed' && !order.confirmedAt) order.confirmedAt = now;
    if (next === 'shipped' && !order.shippedAt) order.shippedAt = now;
    if (next === 'delivered' || next === 'completed') {
      if (!order.deliveredAt) order.deliveredAt = now;
      if (order.paymentMethod === 'cod' && order.paymentStatus === 'unpaid') {
        order.paymentStatus = 'paid';
      }
    }
    if (next === 'cancelled') {
      order.cancelledAt = now;
      order.cancelReason = note;
      if (order.stockDeducted && !order.stockRestored) {
        await restoreOrderStock(
          order,
          order.items.map((i) => ({ productId: String(i.product), quantity: i.quantity })),
          'order_cancel',
          by,
          session,
        );
        order.stockRestored = true;
      }
      if (prevStatus !== 'cancelled' && prevStatus !== 'returned') {
        await ProductModel.bulkWrite(
          order.items.map((i) => ({
            updateOne: { filter: { _id: i.product }, update: { $inc: { soldCount: -i.quantity } } },
          })),
          { session },
        );
      }
    }

    if (next === 'returned') {
      order.returnedAt = now;
      const alreadyReturnedMap = new Map<string, number>();
      for (const ri of order.returnedItems ?? []) {
        const k = String(ri.orderItemId);
        alreadyReturnedMap.set(k, (alreadyReturnedMap.get(k) ?? 0) + ri.quantity);
      }

      const requested = opts?.returnItems?.length
        ? opts.returnItems
        : order.items
            .map((i) => ({
              orderItemId: String(i._id),
              quantity: Math.max(0, i.quantity - (alreadyReturnedMap.get(String(i._id)) ?? 0)),
              restock: true,
            }))
            .filter((x) => x.quantity > 0);

      const newReturnEntries = [];
      const toRestock: { productId: string; quantity: number }[] = [];
      let computedRefund = 0;

      for (const req of requested) {
        const line = order.items.find((i) => String(i._id) === req.orderItemId);
        if (!line) throw new AppError('Returned item not found in this order.');
        const prevQty = alreadyReturnedMap.get(req.orderItemId) ?? 0;
        const remaining = line.quantity - prevQty;
        if (req.quantity > remaining) {
          throw new AppError(
            `Cannot return ${req.quantity} of "${line.name}" — only ${remaining} remaining.`,
          );
        }
        const lineRefund = line.unitPrice * req.quantity;
        computedRefund += lineRefund;
        const shouldRestock = req.restock && order.stockDeducted && !order.stockRestored;
        if (shouldRestock) {
          toRestock.push({ productId: String(line.product), quantity: req.quantity });
        }
        newReturnEntries.push({
          orderItemId: line._id,
          product: line.product,
          name: line.name,
          quantity: req.quantity,
          unitPrice: line.unitPrice,
          supplierPrice: line.supplierPrice,
          lineTotal: lineRefund,
          restocked: shouldRestock,
        });
      }

      if (toRestock.length > 0) {
        await restoreOrderStock(order, toRestock, 'order_return', by, session);
      }
      order.returnedItems = [...(order.returnedItems ?? []), ...newReturnEntries];
      const addRefund = opts?.refundAmount ?? computedRefund;
      order.refundedAmount = (order.refundedAmount ?? 0) + addRefund;
      if (addRefund > 0 && order.paymentStatus === 'paid') {
        order.paymentStatus = 'refunded';
      }

      // If all ordered units have been returned, mark stockRestored to prevent duplicate restock.
      const totalOrdered = order.items.reduce((s, i) => s + i.quantity, 0);
      const totalReturned = order.returnedItems.reduce((s, i) => s + i.quantity, 0);
      if (totalReturned >= totalOrdered) {
        order.stockRestored = true;
      }

      if (prevStatus !== 'cancelled' && prevStatus !== 'returned') {
        await ProductModel.bulkWrite(
          newReturnEntries.map((ri) => ({
            updateOne: {
              filter: { _id: ri.product },
              update: { $inc: { soldCount: -ri.quantity } },
            },
          })),
          { session },
        );
      }

      if (opts?.customerPaidDelivery === false) {
        const deliveryExpenseAmount = opts.returnDeliveryExpenseAmount ?? order.shippingFee ?? 0;
        await recordSystemExpense(
          {
            categorySlug: 'delivery-courier-charges',
            title: `Return delivery charge — ${order.orderNumber}`,
            amount: deliveryExpenseAmount,
            description: `Customer did not pay delivery charge on returned order ${order.orderNumber} (${order.customer.name}, ${order.customer.phone}).`,
            business: order.business,
            createdBy: by,
          },
          session,
        );
      }
    }

    await order.save({ session });
    return order;
  });

  await notifyCustomerOrderStatus(updatedOrder, next);
}

export async function updateOrderMeta(
  orderId: string,
  data: { paymentStatus: PaymentStatus; adminNote?: string },
): Promise<void> {
  await connectDB();
  const res = await OrderModel.updateOne({ _id: orderId }, { $set: data });
  if (!res.matchedCount) throw new AppError('Order not found.', 404);
}

export async function cancelOrderByCustomer(userId: string, orderId: string, reason?: string) {
  await connectDB();
  const now = new Date();
  // Atomic: only flips the order if it is still in a cancellable status.
  const order = await OrderModel.findOneAndUpdate(
    { _id: orderId, user: userId, status: { $in: CUSTOMER_CANCELLABLE_STATUSES } },
    {
      $set: {
        status: 'cancelled',
        cancelledAt: now,
        cancelReason: reason ?? 'Cancelled by customer',
      },
      $push: {
        statusHistory: { status: 'cancelled', note: 'Cancelled by customer', at: now, by: userId },
      },
    },
    { returnDocument: 'after' },
  ).lean();
  if (!order) {
    throw new AppError('This order can no longer be cancelled — it has already been confirmed.');
  }
  if (order.stockDeducted && !order.stockRestored) {
    await restoreOrderStock(
      order,
      order.items.map((i) => ({ productId: String(i.product), quantity: i.quantity })),
      'order_cancel',
      userId,
    );
    await OrderModel.updateOne({ _id: order._id }, { $set: { stockRestored: true } });
  }
  await revertSoldCounts(order);
  await notifyAdminsOrderCancelled(order);
}

export { withinReturnWindow };
