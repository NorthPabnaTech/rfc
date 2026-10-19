import 'server-only';

import type { QueryFilter, Types } from 'mongoose';

import {
  AddressModel,
  connectDB,
  nextSequence,
  type Order,
  type OrderItem,
  OrderModel,
  ProductModel,
  ReturnRequestModel,
  type Supplier,
  UserModel,
} from '@/database';
import type { CartQuote, CartQuoteLine, OrderDTO, OrderRowDTO, Paginated } from '@/types';
import {
  ADMIN_PAGE_SIZE,
  CUSTOMER_CANCELLABLE_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_TRANSITIONS,
  type OrderPlatform,
  type OrderStatus,
  type PaymentStatus,
  RETURN_WINDOW_HOURS,
  type ShippingZone,
} from '@lib/constants';
import { AppError } from '@lib/errors';
import type { CartLineInput } from '@lib/validators/order';

import { toImage, toOrder, toReturn } from './mappers';
import { getSettings } from './settings';

/* ─── Pricing ────────────────────────────────────────────────────────────── */

type PricedLine = CartQuoteLine & { item?: Omit<OrderItem, '_id'> };

/**
 * Prices cart lines from the database — the client's prices are never
 * trusted. Each line reports whether it can be ordered and, if not, why.
 */
async function priceLines(
  lines: CartLineInput[],
  { includeDrafts = false }: { includeDrafts?: boolean } = {},
): Promise<PricedLine[]> {
  await connectDB();
  const ids = [...new Set(lines.map((l) => l.productId))];
  const products = await ProductModel.find({
    _id: { $in: ids },
    ...(includeDrafts ? {} : { status: 'published' }),
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

export async function quoteCart(lines: CartLineInput[], zone?: ShippingZone): Promise<CartQuote> {
  const priced = await priceLines(lines);
  const subtotal = priced.filter((l) => l.available).reduce((sum, l) => sum + l.lineTotal, 0);
  const shippingFee = await shippingFor(zone, subtotal);
  const { freeShippingThreshold } = await getSettings();
  return {
    lines: priced.map(({ item: _item, ...rest }) => rest),
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
    freeShippingThreshold,
  };
}

/* ─── Creating orders ────────────────────────────────────────────────────── */

type NewOrder = {
  lines: CartLineInput[];
  userId: string | null;
  customer: { name: string; phone: string; email?: string };
  shippingAddress: Order['shippingAddress'];
  platform: OrderPlatform;
  status?: Extract<OrderStatus, 'pending' | 'confirmed'>;
  shippingFeeOverride?: number;
  discount?: number;
  customerNote?: string;
  adminNote?: string;
  createdBy?: string | null;
  includeDrafts?: boolean;
};

async function createOrder(input: NewOrder): Promise<{ id: string; orderNumber: string }> {
  const priced = await priceLines(input.lines, { includeDrafts: input.includeDrafts });
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

  const orderNumber = `NV-${await nextSequence('order')}`;
  const order = await OrderModel.create({
    orderNumber,
    user: input.userId,
    customer: input.customer,
    shippingAddress: input.shippingAddress,
    items,
    subtotal,
    shippingFee,
    discount,
    total: subtotal + shippingFee - discount,
    supplierCost,
    paymentMethod: 'cod',
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
  });

  await ProductModel.bulkWrite(
    items.map((i) => ({
      updateOne: { filter: { _id: i.product }, update: { $inc: { soldCount: i.quantity } } },
    })),
  );

  return { id: String(order._id), orderNumber };
}

export async function placeWebsiteOrder(input: {
  lines: CartLineInput[];
  userId: string | null;
  name: string;
  phone: string;
  email?: string;
  address: Order['shippingAddress'];
  customerNote?: string;
  saveAddress?: boolean;
}) {
  const result = await createOrder({
    lines: input.lines,
    userId: input.userId,
    customer: { name: input.name, phone: input.phone, email: input.email },
    shippingAddress: input.address,
    platform: 'website',
    customerNote: input.customerNote,
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
  return result;
}

export async function createManualOrder(
  input: Omit<NewOrder, 'includeDrafts'> & { createdBy: string },
) {
  await connectDB();
  if (input.userId && !(await UserModel.exists({ _id: input.userId }))) {
    throw new AppError('Selected customer account not found.');
  }
  return createOrder({ ...input, includeDrafts: true });
}

/* ─── Reading orders ─────────────────────────────────────────────────────── */

export type AdminOrderFilters = {
  q?: string;
  status?: OrderStatus;
  platform?: OrderPlatform;
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
    customer: { name: o.customer.name, phone: o.customer.phone, email: o.customer.email },
    total: o.total,
    status: o.status,
    platform: o.platform,
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
    OrderModel.findById(id).lean(),
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
    canRequestReturn: !ret && withinReturnWindow(doc),
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
    'orderNumber total createdAt customer.name items.quantity status',
  ).lean();
  if (!doc) return null;
  return {
    orderNumber: doc.orderNumber,
    total: doc.total,
    firstName: doc.customer.name.split(' ')[0] ?? '',
    itemCount: doc.items.reduce((s, i) => s + i.quantity, 0),
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
): Promise<void> {
  await connectDB();
  const order = await OrderModel.findById(orderId);
  if (!order) throw new AppError('Order not found.', 404);
  if (!ORDER_TRANSITIONS[order.status].includes(next)) {
    throw new AppError(
      `Can't move an order from ${ORDER_STATUS_LABELS[order.status]} to ${ORDER_STATUS_LABELS[next]}.`,
    );
  }

  const now = new Date();
  order.status = next;
  order.statusHistory.push({ status: next, note, at: now, by: by as never });
  if (next === 'confirmed') order.confirmedAt = now;
  if (next === 'shipped') order.shippedAt = now;
  if (next === 'delivered') {
    order.deliveredAt = now;
    if (order.paymentMethod === 'cod') order.paymentStatus = 'paid';
  }
  if (next === 'cancelled') {
    order.cancelledAt = now;
    order.cancelReason = note;
  }
  await order.save();
  if (next === 'cancelled') await revertSoldCounts(order);
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
  await revertSoldCounts(order);
}

export { withinReturnWindow };
