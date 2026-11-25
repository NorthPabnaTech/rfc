import 'server-only';

import {
  connectDB,
  nextSequence,
  OrderModel,
  ProductModel,
  type Reseller,
  ResellerChangeLogModel,
  type ResellerDocument,
  ResellerModel,
  SettingsModel,
  SupplierOrderModel,
  SupportTicketModel,
  WalletTransactionModel,
  withTransaction,
} from '@/database';
import { hashPassword, verifyPassword } from '@lib/auth/password';
import {
  MIN_RESELLER_DEPOSIT,
  MIN_RESELLER_WITHDRAWAL,
  TICKET_STATUS_TRANSITIONS,
  type OrderStatus,
  type TicketPriority,
  type TicketStatus,
  type WalletTxStatus,
  type WalletTxType,
} from '@lib/constants';
import { AppError } from '@lib/errors';
import { deliveryZoneFor } from '@lib/locations';

import { createSupplierOrdersForOrder } from './supplier-orders';

async function nextWalletTxNumber(): Promise<string> {
  const n = await nextSequence('wallet_tx', 100_000);
  return `WTX-${n}`;
}

async function nextTicketNumber(): Promise<string> {
  const n = await nextSequence('support_ticket', 100_000);
  return `TKT-${n}`;
}

async function nextOrderNumber(): Promise<string> {
  const n = await nextSequence('order', 100_000);
  return `RFC-${n}`;
}

function getResellerUnitPrice(p: { supplierPrice?: number; resellerProfit?: number }): number {
  return Math.max(0, (p.supplierPrice ?? 0) + (p.resellerProfit ?? 0));
}

function getResellerPackagingCost(p: {
  resellerPackagingCost?: number;
  supplierPackagingCost?: number;
}): number {
  return Math.max(0, p.resellerPackagingCost ?? p.supplierPackagingCost ?? 0);
}

/* ─── Auth & Profile ─────────────────────────────────────────────────────── */

export async function registerReseller(input: {
  name: string;
  shopName: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
}): Promise<ResellerDocument> {
  await connectDB();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();

  const existing = await ResellerModel.findOne({ $or: [{ email }, { phone }] }).lean();
  if (existing) {
    throw new AppError(
      existing.email === email
        ? 'An account with this email already exists.'
        : 'An account with this phone number already exists.',
      409,
    );
  }

  const passwordHash = await hashPassword(input.password);
  const reseller = await ResellerModel.create({
    name: input.name.trim(),
    shopName: input.shopName.trim(),
    email,
    phone,
    address: input.address?.trim(),
    passwordHash,
    isActive: true,
    lastLoginAt: new Date(),
  });
  return reseller;
}

export async function authenticateReseller(
  identifier: string,
  password: string,
): Promise<ResellerDocument> {
  await connectDB();
  const trimmed = identifier.trim();
  const query = trimmed.includes('@')
    ? { email: trimmed.toLowerCase() }
    : { phone: trimmed };

  const reseller = await ResellerModel.findOne(query).select('+passwordHash');
  if (!reseller || !reseller.passwordHash) {
    throw new AppError('Invalid credentials.', 401);
  }
  if (!reseller.isActive) {
    throw new AppError('Your reseller account has been deactivated by admin.', 403);
  }
  const ok = await verifyPassword(password, reseller.passwordHash);
  if (!ok) {
    throw new AppError('Invalid credentials.', 401);
  }
  reseller.lastLoginAt = new Date();
  await reseller.save();
  return reseller;
}

export async function findOrCreateGoogleReseller(profile: {
  googleId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}): Promise<ResellerDocument> {
  await connectDB();
  const email = profile.email.trim().toLowerCase();

  let reseller = await ResellerModel.findOne({
    $or: [{ googleId: profile.googleId }, { email }],
  });

  if (reseller) {
    if (!reseller.isActive) {
      throw new AppError('Your reseller account has been deactivated by admin.', 403);
    }
    if (!reseller.googleId) reseller.googleId = profile.googleId;
    if (!reseller.avatarUrl && profile.avatarUrl) reseller.avatarUrl = profile.avatarUrl;
    reseller.lastLoginAt = new Date();
    await reseller.save();
    return reseller;
  }

  const displayName = profile.name?.trim() || email.split('@')[0] || 'Reseller';
  reseller = await ResellerModel.create({
    name: displayName,
    shopName: `${displayName}'s Shop`,
    email,
    googleId: profile.googleId,
    avatarUrl: profile.avatarUrl,
    isActive: true,
    lastLoginAt: new Date(),
  });
  return reseller;
}

/* ─── Catalog (Price-Gated) ──────────────────────────────────────────────── */

export async function listResellerCatalog(
  opts: { q?: string; category?: string; page?: number; limit?: number },
  authenticated: boolean,
) {
  await connectDB();
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {
    resellerEnabled: true,
    status: 'published',
  };
  if (opts.category) filter.category = opts.category;
  if (opts.q?.trim()) {
    const regex = new RegExp(opts.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { sku: regex }, { shortDescription: regex }];
  }

  const settings = authenticated ? await SettingsModel.findOne().lean() : null;

  const [docs, total] = await Promise.all([
    ProductModel.find(filter)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ProductModel.countDocuments(filter),
  ]);

  const items = docs.map((p) => formatResellerProduct(p, authenticated, settings));
  return { items, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getResellerProductBySlug(slug: string, authenticated: boolean) {
  await connectDB();
  const doc = await ProductModel.findOne({
    slug: slug.toLowerCase(),
    resellerEnabled: true,
    status: 'published',
  })
    .populate('category', 'name slug')
    .lean();

  if (!doc) return null;
  const settings = authenticated ? await SettingsModel.findOne().lean() : null;
  return formatResellerProduct(doc, authenticated, settings);
}

function formatResellerProduct(
  p: Record<string, any>,
  authenticated: boolean,
  settings: Record<string, any> | null,
) {
  const base = {
    id: String(p._id),
    name: p.name,
    slug: p.slug,
    sku: p.sku ?? null,
    shortDescription: p.shortDescription ?? null,
    description: p.description ?? null,
    category: p.category
      ? { id: String(p.category._id), name: p.category.name, slug: p.category.slug }
      : null,
    images: (p.images ?? []).map((img: { url: string; alt?: string }) => ({
      url: img.url,
      alt: img.alt ?? p.name,
    })),
    variations: p.variations ?? [],
    specifications: p.specifications ?? [],
    stockStatus: p.stockStatus,
    stockQuantity: p.stockQuantity ?? 0,
  };

  if (!authenticated) {
    // Unauthenticated visitors cannot see any pricing.
    return base;
  }

  const resellerPrice = getResellerUnitPrice(p);
  const packagingCost = getResellerPackagingCost(p);
  const defaultInside = settings?.shippingFeeInsideDhaka ?? 70;
  const defaultOutside = settings?.shippingFeeOutsideDhaka ?? 130;

  return {
    ...base,
    resellerPrice,
    suggestedRetailPrice: p.effectivePrice ?? resellerPrice,
    packagingCost,
    deliveryCharges: {
      insideDhaka: p.supplierDeliveryCharges?.insideDhaka ?? defaultInside,
      outsideDhaka: p.supplierDeliveryCharges?.outsideDhaka ?? defaultOutside,
    },
  };
}

/* ─── Wallet & Transactions ──────────────────────────────────────────────── */

export async function listResellerTransactions(
  resellerId: string,
  opts: { page?: number; limit?: number; type?: WalletTxType; status?: WalletTxStatus } = {},
) {
  await connectDB();
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const filter: Record<string, unknown> = { reseller: resellerId };
  if (opts.type) filter.type = opts.type;
  if (opts.status) filter.status = opts.status;

  const [items, total] = await Promise.all([
    WalletTransactionModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    WalletTransactionModel.countDocuments(filter),
  ]);

  return {
    items: items.map((t) => ({
      id: String(t._id),
      txNumber: t.txNumber,
      type: t.type,
      direction: t.direction,
      amount: t.amount,
      balanceBefore: t.balanceBefore,
      balanceAfter: t.balanceAfter,
      status: t.status,
      orderNumber: t.orderNumber ?? null,
      paymentMethod: t.paymentMethod ?? null,
      paymentReference: t.paymentReference ?? null,
      payoutMethod: t.payoutMethod ?? null,
      payoutAccount: t.payoutAccount ?? null,
      note: t.note ?? null,
      createdAt: t.createdAt,
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function createResellerDepositRequest(input: {
  resellerId: string;
  amount: number;
  paymentMethod?: string;
  paymentReference?: string;
  note?: string;
}) {
  await connectDB();
  if (!Number.isFinite(input.amount) || input.amount < MIN_RESELLER_DEPOSIT) {
    throw new AppError(`Minimum add balance amount is ৳${MIN_RESELLER_DEPOSIT}.`, 400);
  }

  const reseller = await ResellerModel.findById(input.resellerId);
  if (!reseller || !reseller.isActive) {
    throw new AppError('Reseller account not found or inactive.', 403);
  }

  const txNumber = await nextWalletTxNumber();
  const tx = await WalletTransactionModel.create({
    txNumber,
    reseller: reseller._id,
    type: 'deposit',
    direction: 'credit',
    amount: Math.round(input.amount),
    balanceBefore: reseller.walletBalance,
    balanceAfter: reseller.walletBalance,
    status: 'pending',
    paymentMethod: input.paymentMethod?.trim() || 'manual',
    paymentReference: input.paymentReference?.trim() || undefined,
    note: input.note?.trim() || 'Wallet deposit request',
  });

  return tx;
}

export async function approveOrRejectResellerDeposit(
  txId: string,
  action: 'approve' | 'reject',
  adminId: string,
  note?: string,
) {
  await connectDB();
  return withTransaction(async (session) => {
    const tx = await WalletTransactionModel.findOne({
      _id: txId,
      type: 'deposit',
      status: 'pending',
    }).session(session ?? null);
    if (!tx) throw new AppError('Pending deposit transaction not found.', 404);

    if (action === 'reject') {
      tx.status = 'rejected';
      tx.processedBy = adminId as never;
      tx.processedAt = new Date();
      if (note) tx.note = note;
      await tx.save({ session });
      return tx;
    }

    const updatedReseller = await ResellerModel.findByIdAndUpdate(
      tx.reseller,
      { $inc: { walletBalance: tx.amount, totalDeposited: tx.amount } },
      { new: true, session },
    );
    if (!updatedReseller) throw new AppError('Reseller not found.', 404);

    tx.balanceAfter = updatedReseller.walletBalance;
    tx.balanceBefore = updatedReseller.walletBalance - tx.amount;
    tx.status = 'completed';
    tx.processedBy = adminId as never;
    tx.processedAt = new Date();
    if (note) tx.note = note;
    await tx.save({ session });
    return tx;
  });
}

export async function requestResellerWithdrawal(input: {
  resellerId: string;
  amount: number;
  payoutMethod: string;
  payoutAccount: string;
  note?: string;
}) {
  await connectDB();
  if (!Number.isFinite(input.amount) || input.amount < MIN_RESELLER_WITHDRAWAL) {
    throw new AppError(`Minimum withdrawal amount is ৳${MIN_RESELLER_WITHDRAWAL}.`, 400);
  }
  const amount = Math.round(input.amount);

  return withTransaction(async (session) => {
    const updatedReseller = await ResellerModel.findOneAndUpdate(
      { _id: input.resellerId, isActive: true, walletBalance: { $gte: amount } },
      { $inc: { walletBalance: -amount } },
      { new: true, session },
    );
    if (!updatedReseller) {
      throw new AppError('Insufficient wallet balance or inactive reseller account.', 400);
    }

    const txNumber = await nextWalletTxNumber();
    const [tx] = await WalletTransactionModel.create(
      [
        {
          txNumber,
          reseller: updatedReseller._id,
          type: 'withdrawal',
          direction: 'debit',
          amount,
          balanceBefore: updatedReseller.walletBalance + amount,
          balanceAfter: updatedReseller.walletBalance,
          status: 'pending',
          payoutMethod: input.payoutMethod.trim(),
          payoutAccount: input.payoutAccount.trim(),
          note: input.note?.trim() || 'Withdrawal request',
        },
      ],
      { session },
    );
    if (!tx) throw new AppError('Failed to create withdrawal transaction.', 500);
    return { tx, walletBalance: updatedReseller.walletBalance };
  });
}

export async function processResellerWithdrawal(
  txId: string,
  action: 'approve' | 'reject',
  adminId: string,
  note?: string,
) {
  await connectDB();
  return withTransaction(async (session) => {
    const tx = await WalletTransactionModel.findOne({
      _id: txId,
      type: 'withdrawal',
      status: 'pending',
    }).session(session ?? null);
    if (!tx) throw new AppError('Pending withdrawal transaction not found.', 404);

    if (action === 'approve') {
      await ResellerModel.findByIdAndUpdate(
        tx.reseller,
        { $inc: { totalWithdrawn: tx.amount } },
        { session },
      );
      tx.status = 'completed';
      tx.processedBy = adminId as never;
      tx.processedAt = new Date();
      if (note) tx.note = note;
      await tx.save({ session });
      return tx;
    }

    // Reject: refund the held amount back to the reseller's wallet.
    const updatedReseller = await ResellerModel.findByIdAndUpdate(
      tx.reseller,
      { $inc: { walletBalance: tx.amount } },
      { new: true, session },
    );
    if (!updatedReseller) throw new AppError('Reseller not found.', 404);

    tx.status = 'rejected';
    tx.processedBy = adminId as never;
    tx.processedAt = new Date();
    if (note) tx.note = note;
    await tx.save({ session });

    const refundTxNumber = await nextWalletTxNumber();
    await WalletTransactionModel.create(
      [
        {
          txNumber: refundTxNumber,
          reseller: tx.reseller,
          type: 'order_refund',
          direction: 'credit',
          amount: tx.amount,
          balanceBefore: updatedReseller.walletBalance - tx.amount,
          balanceAfter: updatedReseller.walletBalance,
          status: 'completed',
          note: note ? `Withdrawal rejected: ${note}` : `Refund for rejected ${tx.txNumber}`,
          processedBy: adminId as never,
          processedAt: new Date(),
        },
      ],
      { session },
    );
    return tx;
  });
}

/* ─── Reseller Orders ────────────────────────────────────────────────────── */

export async function placeResellerOrder(
  resellerId: string,
  input: {
    customer: { name: string; phone: string; email?: string };
    shippingAddress: {
      fullName?: string;
      phone?: string;
      division: string;
      district: string;
      area: string;
      street: string;
    };
    items: {
      productId: string;
      quantity: number;
      sellingPrice: number;
      variant?: Record<string, string>;
    }[];
    customerNote?: string;
  },
) {
  await connectDB();
  if (!input.items.length) {
    throw new AppError('At least one product is required.', 400);
  }

  const [reseller, settings] = await Promise.all([
    ResellerModel.findById(resellerId),
    SettingsModel.findOne().lean(),
  ]);
  if (!reseller || !reseller.isActive) {
    throw new AppError('Reseller account is inactive or not found.', 403);
  }

  const productIds = input.items.map((i) => i.productId);
  const products = await ProductModel.find({
    _id: { $in: productIds },
    resellerEnabled: true,
    status: 'published',
  }).lean();
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const zone = deliveryZoneFor(input.shippingAddress.district, input.shippingAddress.area);
  const insideDhaka = zone === 'inside_dhaka';
  const defaultShipping = insideDhaka
    ? (settings?.shippingFeeInsideDhaka ?? 70)
    : (settings?.shippingFeeOutsideDhaka ?? 130);

  let resellerPriceTotal = 0;
  let resellerSellingTotal = 0;
  let supplierCostTotal = 0;
  let packagingCost = 0;
  let deliveryCharge = defaultShipping;

  const orderItems = input.items.map((reqItem) => {
    const product = productMap.get(reqItem.productId);
    if (!product) {
      throw new AppError('One or more selected products are not available for resellers.', 400);
    }
    if (product.stockStatus === 'out_of_stock') {
      throw new AppError(`"${product.name}" is currently out of stock.`, 400);
    }
    const qty = Math.max(1, Math.floor(reqItem.quantity));
    const unitResellerPrice = getResellerUnitPrice(product);
    if (reqItem.sellingPrice < unitResellerPrice) {
      throw new AppError(
        `Selling price for "${product.name}" (৳${reqItem.sellingPrice}) cannot be lower than reseller price (৳${unitResellerPrice}).`,
        400,
      );
    }

    const lineResellerTotal = unitResellerPrice * qty;
    const lineSellingTotal = reqItem.sellingPrice * qty;
    resellerPriceTotal += lineResellerTotal;
    resellerSellingTotal += lineSellingTotal;
    supplierCostTotal += (product.supplierPrice ?? 0) * qty;

    const itemPkg = getResellerPackagingCost(product);
    if (itemPkg > packagingCost) packagingCost = itemPkg;

    const customDelivery = insideDhaka
      ? product.supplierDeliveryCharges?.insideDhaka
      : product.supplierDeliveryCharges?.outsideDhaka;
    if (customDelivery != null && customDelivery > deliveryCharge) {
      deliveryCharge = customDelivery;
    }

    return {
      product: product._id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      image: product.images?.[0]?.url,
      variant: reqItem.variant,
      unitPrice: reqItem.sellingPrice,
      supplierPrice: product.supplierPrice ?? 0,
      quantity: qty,
      lineTotal: lineSellingTotal,
      type: product.type,
    };
  });

  const upfrontCost = deliveryCharge + packagingCost;
  if (reseller.walletBalance < upfrontCost) {
    throw new AppError(
      `Insufficient wallet balance. Required ৳${upfrontCost} (Delivery ৳${deliveryCharge} + Packaging ৳${packagingCost}), available ৳${reseller.walletBalance}.`,
      400,
    );
  }

  const expectedResellerProfit = resellerSellingTotal - resellerPriceTotal - packagingCost;
  const orderNumber = await nextOrderNumber();

  const savedOrder = await withTransaction(async (session) => {
    const updatedReseller = await ResellerModel.findOneAndUpdate(
      { _id: reseller._id, isActive: true, walletBalance: { $gte: upfrontCost } },
      { $inc: { walletBalance: -upfrontCost, totalOrders: 1 } },
      { new: true, session },
    );
    if (!updatedReseller) {
      throw new AppError(
        `Insufficient wallet balance. Required ৳${upfrontCost} for delivery and packaging.`,
        400,
      );
    }

    const [createdOrder] = await OrderModel.create(
      [
        {
          orderNumber,
          reseller: reseller._id,
          customer: {
            name: input.customer.name.trim(),
            phone: input.customer.phone.trim(),
            email: input.customer.email?.trim().toLowerCase(),
          },
          shippingAddress: {
            fullName: input.shippingAddress.fullName?.trim() || input.customer.name.trim(),
            phone: input.shippingAddress.phone?.trim() || input.customer.phone.trim(),
            addressLine: input.shippingAddress.street.trim(),
            division: input.shippingAddress.division.trim(),
            area: input.shippingAddress.area.trim(),
            city: input.shippingAddress.district.trim(),
            zone,
          },
          items: orderItems,
          subtotal: resellerSellingTotal,
          shippingFee: deliveryCharge,
          discount: 0,
          total: resellerSellingTotal + deliveryCharge,
          supplierCost: supplierCostTotal,
          paymentMethod: 'cod',
          paymentStatus: 'unpaid',
          platform: 'reseller',
          status: 'pending',
          statusHistory: [
            {
              status: 'pending',
              note: `Reseller order by ${reseller.shopName} (Upfront deducted: ৳${upfrontCost})`,
              at: new Date(),
            },
          ],
          customerNote: input.customerNote?.trim(),
          resellerSummary: {
            resellerPriceTotal,
            resellerSellingTotal,
            deliveryCharge,
            packagingCost,
            upfrontDeducted: upfrontCost,
            expectedResellerProfit,
            profitCredited: false,
            upfrontRefunded: false,
          },
        },
      ],
      { session },
    );

    if (!createdOrder) throw new AppError('Failed to create order.', 500);

    if (upfrontCost > 0) {
      const txNumber = await nextWalletTxNumber();
      await WalletTransactionModel.create(
        [
          {
            txNumber,
            reseller: reseller._id,
            type: 'order_deduction',
            direction: 'debit',
            amount: upfrontCost,
            balanceBefore: updatedReseller.walletBalance + upfrontCost,
            balanceAfter: updatedReseller.walletBalance,
            status: 'completed',
            order: createdOrder._id,
            orderNumber,
            note: `Delivery (৳${deliveryCharge}) + Packaging (৳${packagingCost}) for ${orderNumber}`,
          },
        ],
        { session },
      );
    }

    return createdOrder;
  });

  // Create SupplierOrder records so Admin can one-click forward to upstream supplier.
  await createSupplierOrdersForOrder(savedOrder);

  return savedOrder;
}

/**
 * Called from `updateOrderStatus` when a reseller order is delivered or cancelled.
 */
export async function settleResellerOrderOnStatusChange(
  order: {
    _id: unknown;
    orderNumber: string;
    reseller?: unknown;
    resellerSummary?: {
      resellerSellingTotal: number;
      upfrontDeducted: number;
      expectedResellerProfit: number;
      profitCredited: boolean;
      upfrontRefunded: boolean;
    };
  },
  nextStatus: OrderStatus,
  prevStatus: OrderStatus,
  session?: Parameters<typeof withTransaction>[0] extends (s: infer S) => unknown ? S : never,
): Promise<void> {
  if (!order.reseller || !order.resellerSummary) return;

  if (
    (nextStatus === 'delivered' || nextStatus === 'completed') &&
    !order.resellerSummary.profitCredited
  ) {
    const profit = Math.max(0, order.resellerSummary.expectedResellerProfit);
    const sales = Math.max(0, order.resellerSummary.resellerSellingTotal);
    const updatedReseller = await ResellerModel.findByIdAndUpdate(
      order.reseller,
      { $inc: { walletBalance: profit, totalProfitEarned: profit, totalSales: sales } },
      { new: true, session },
    );
    if (updatedReseller && profit > 0) {
      const txNumber = await nextWalletTxNumber();
      await WalletTransactionModel.create(
        [
          {
            txNumber,
            reseller: order.reseller as never,
            type: 'order_profit',
            direction: 'credit',
            amount: profit,
            balanceBefore: updatedReseller.walletBalance - profit,
            balanceAfter: updatedReseller.walletBalance,
            status: 'completed',
            order: order._id as never,
            orderNumber: order.orderNumber,
            note: `Profit credited for delivered order ${order.orderNumber}`,
          },
        ],
        { session },
      );
    }
    order.resellerSummary.profitCredited = true;
  }

  if (
    nextStatus === 'cancelled' &&
    prevStatus !== 'shipped' &&
    prevStatus !== 'delivered' &&
    prevStatus !== 'completed' &&
    prevStatus !== 'returned' &&
    !order.resellerSummary.upfrontRefunded &&
    order.resellerSummary.upfrontDeducted > 0
  ) {
    const refund = order.resellerSummary.upfrontDeducted;
    const updatedReseller = await ResellerModel.findByIdAndUpdate(
      order.reseller,
      { $inc: { walletBalance: refund } },
      { new: true, session },
    );
    if (updatedReseller) {
      const txNumber = await nextWalletTxNumber();
      await WalletTransactionModel.create(
        [
          {
            txNumber,
            reseller: order.reseller as never,
            type: 'order_refund',
            direction: 'credit',
            amount: refund,
            balanceBefore: updatedReseller.walletBalance - refund,
            balanceAfter: updatedReseller.walletBalance,
            status: 'completed',
            order: order._id as never,
            orderNumber: order.orderNumber,
            note: `Delivery & packaging refunded for cancelled order ${order.orderNumber}`,
          },
        ],
        { session },
      );
    }
    order.resellerSummary.upfrontRefunded = true;
  }
}

export async function cancelResellerOrder(
  resellerId: string,
  orderIdOrNumber: string,
  reason?: string,
) {
  await connectDB();
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(orderIdOrNumber);
  const filter = isObjectId
    ? { _id: orderIdOrNumber, reseller: resellerId }
    : { orderNumber: orderIdOrNumber, reseller: resellerId };

  const existing = await OrderModel.findOne(filter).select('_id status').lean();
  if (!existing) throw new AppError('Order not found.', 404);
  if (existing.status !== 'pending') {
    throw new AppError('Only pending orders can be cancelled before confirmation.', 400);
  }

  await withTransaction(async (session) => {
    const order = await OrderModel.findOne({ _id: existing._id, reseller: resellerId }).session(
      session ?? null,
    );
    if (!order) throw new AppError('Order not found.', 404);
    if (order.status !== 'pending') {
      throw new AppError('Only pending orders can be cancelled before confirmation.', 400);
    }

    const cancelNote = reason?.trim() || 'Cancelled by reseller';
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = cancelNote;
    order.statusHistory.push({
      status: 'cancelled',
      note: cancelNote,
      at: new Date(),
    });

    await settleResellerOrderOnStatusChange(order, 'cancelled', 'pending', session);
    await order.save({ session });

    await SupplierOrderModel.updateMany(
      { order: order._id, status: 'awaiting_confirmation' },
      { $set: { status: 'cancelled' } },
      { session },
    );
  });

  return getResellerOrderDetail(resellerId, String(existing._id));
}

/* ─── Reseller Dashboard & Orders ────────────────────────────────────────── */

export async function getResellerDashboardStats(resellerId: string, days = 30) {
  await connectDB();
  const safeDays = Math.min(90, Math.max(7, days));
  const since = new Date();
  since.setDate(since.getDate() - (safeDays - 1));
  since.setHours(0, 0, 0, 0);

  const [reseller, statusAgg, dailyAgg] = await Promise.all([
    ResellerModel.findById(resellerId).lean(),
    OrderModel.aggregate<{ _id: string; count: number; sales: number; profit: number }>([
      { $match: { reseller: new (await import('mongoose')).Types.ObjectId(resellerId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          sales: { $sum: '$resellerSummary.resellerSellingTotal' },
          profit: { $sum: '$resellerSummary.expectedResellerProfit' },
        },
      },
    ]),
    OrderModel.aggregate<{ _id: string; orders: number; revenue: number; profit: number }>([
      {
        $match: {
          reseller: new (await import('mongoose')).Types.ObjectId(resellerId),
          createdAt: { $gte: since },
          status: { $nin: ['cancelled', 'returned'] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$resellerSummary.resellerSellingTotal' },
          profit: { $sum: '$resellerSummary.expectedResellerProfit' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const byStatus: Record<string, number> = {};
  let totalOrders = 0;
  for (const row of statusAgg) {
    byStatus[row._id] = row.count;
    totalOrders += row.count;
  }

  const dailyMap = new Map(dailyAgg.map((d) => [d._id, d]));
  const chart: { date: string; orders: number; revenue: number; profit: number }[] = [];
  for (let i = 0; i < safeDays; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const hit = dailyMap.get(key);
    chart.push({
      date: key,
      orders: hit?.orders ?? 0,
      revenue: hit?.revenue ?? 0,
      profit: hit?.profit ?? 0,
    });
  }

  return {
    walletBalance: reseller?.walletBalance ?? 0,
    totalDeposited: reseller?.totalDeposited ?? 0,
    totalWithdrawn: reseller?.totalWithdrawn ?? 0,
    totalProfitEarned: reseller?.totalProfitEarned ?? 0,
    totalSales: reseller?.totalSales ?? 0,
    totalOrders,
    statusCounts: {
      pending: byStatus.pending ?? 0,
      confirmed: byStatus.confirmed ?? 0,
      processing: byStatus.processing ?? 0,
      shipped: byStatus.shipped ?? 0,
      delivered: (byStatus.delivered ?? 0) + (byStatus.completed ?? 0),
      cancelled: byStatus.cancelled ?? 0,
      returned: byStatus.returned ?? 0,
    },
    chart,
  };
}

export async function listResellerOrders(
  resellerId: string,
  opts: { page?: number; limit?: number; status?: string } = {},
) {
  await connectDB();
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const filter: Record<string, unknown> = { reseller: resellerId };
  if (opts.status) filter.status = opts.status;

  const [items, total] = await Promise.all([
    OrderModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    OrderModel.countDocuments(filter),
  ]);

  return {
    items: items.map((o) => ({
      id: String(o._id),
      orderNumber: o.orderNumber,
      status: o.status,
      customer: o.customer,
      shippingAddress: o.shippingAddress,
      items: o.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: i.lineTotal,
        image: i.image ?? null,
        variant: i.variant ?? null,
      })),
      total: o.total,
      resellerSummary: o.resellerSummary ?? null,
      createdAt: o.createdAt,
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getResellerOrderDetail(resellerId: string, orderId: string) {
  await connectDB();
  const order = await OrderModel.findOne({ _id: orderId, reseller: resellerId }).lean();
  if (!order) return null;
  const supplierOrders = await SupplierOrderModel.find({ order: order._id })
    .select('productName status externalOrderId externalStatus lastSyncedAt')
    .lean();

  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    customer: order.customer,
    shippingAddress: order.shippingAddress,
    items: order.items,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    total: order.total,
    resellerSummary: order.resellerSummary ?? null,
    statusHistory: order.statusHistory,
    supplierTracking: supplierOrders.map((s) => ({
      productName: s.productName,
      status: s.status,
      externalOrderId: s.externalOrderId ?? null,
      externalStatus: s.externalStatus ?? null,
      lastSyncedAt: s.lastSyncedAt ?? null,
    })),
    createdAt: order.createdAt,
  };
}

/* ─── Support Tickets ────────────────────────────────────────────────────── */

export async function createSupportTicket(input: {
  resellerId: string;
  resellerName: string;
  subject: string;
  category?: string;
  priority?: TicketPriority;
  message: string;
  orderNumber?: string;
}) {
  await connectDB();
  let orderId = null;
  if (input.orderNumber?.trim()) {
    const order = await OrderModel.findOne({
      orderNumber: input.orderNumber.trim().toUpperCase(),
      reseller: input.resellerId,
    })
      .select('_id')
      .lean();
    if (order) orderId = order._id;
  }

  const ticketNumber = await nextTicketNumber();
  return SupportTicketModel.create({
    ticketNumber,
    reseller: input.resellerId,
    order: orderId,
    orderNumber: input.orderNumber?.trim().toUpperCase() || undefined,
    subject: input.subject.trim(),
    category: input.category?.trim() || 'General',
    priority: input.priority ?? 'medium',
    status: 'open',
    messages: [
      {
        senderRole: 'reseller',
        senderName: input.resellerName,
        message: input.message.trim(),
        createdAt: new Date(),
      },
    ],
    lastReplyAt: new Date(),
  });
}

export async function replySupportTicket(input: {
  ticketId: string;
  resellerId?: string;
  senderRole: 'reseller' | 'admin';
  senderName: string;
  message: string;
}) {
  await connectDB();
  const filter: Record<string, unknown> = { _id: input.ticketId };
  if (input.resellerId) filter.reseller = input.resellerId;

  const ticket = await SupportTicketModel.findOne(filter);
  if (!ticket) throw new AppError('Support ticket not found.', 404);
  if (ticket.status === 'closed' || ticket.status === 'resolved') {
    throw new AppError(`This ticket is ${ticket.status} and cannot receive new replies.`, 400);
  }

  ticket.messages.push({
    senderRole: input.senderRole,
    senderName: input.senderName,
    message: input.message.trim(),
    createdAt: new Date(),
  });
  ticket.lastReplyAt = new Date();
  if (input.senderRole === 'admin' && ticket.status === 'open') {
    ticket.status = 'in_progress';
  }
  await ticket.save();
  return ticket;
}

/* ─── Admin Queries & Mutations ──────────────────────────────────────────── */

export async function listAdminResellers(opts: { q?: string; status?: 'active' | 'inactive' } = {}) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (opts.status === 'active') filter.isActive = true;
  if (opts.status === 'inactive') filter.isActive = false;
  if (opts.q?.trim()) {
    const regex = new RegExp(opts.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { shopName: regex }, { email: regex }, { phone: regex }];
  }
  return ResellerModel.find(filter).sort({ createdAt: -1 }).lean();
}

export async function getAdminResellerDetail(id: string) {
  await connectDB();
  const reseller = await ResellerModel.findById(id).lean();
  if (!reseller) return null;

  const [orders, transactions, tickets, changeLogs] = await Promise.all([
    OrderModel.find({ reseller: reseller._id }).sort({ createdAt: -1 }).limit(20).lean(),
    WalletTransactionModel.find({ reseller: reseller._id }).sort({ createdAt: -1 }).limit(30).lean(),
    SupportTicketModel.find({ reseller: reseller._id }).sort({ lastReplyAt: -1 }).limit(15).lean(),
    ResellerChangeLogModel.find({ reseller: reseller._id }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);

  return { reseller, orders, transactions, tickets, changeLogs };
}

export async function toggleResellerActive(resellerId: string, isActive: boolean) {
  await connectDB();
  const updated = await ResellerModel.findByIdAndUpdate(
    resellerId,
    { $set: { isActive } },
    { new: true },
  );
  if (!updated) throw new AppError('Reseller not found.', 404);
  return updated;
}

export async function adminAdjustResellerWallet(input: {
  resellerId: string;
  direction: 'credit' | 'debit';
  amount: number;
  note: string;
  adminId: string;
}) {
  await connectDB();
  const amount = Math.round(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError('Amount must be greater than 0.', 400);
  }

  return withTransaction(async (session) => {
    const delta = input.direction === 'credit' ? amount : -amount;
    const filter =
      input.direction === 'debit'
        ? { _id: input.resellerId, walletBalance: { $gte: amount } }
        : { _id: input.resellerId };

    const updatedReseller = await ResellerModel.findOneAndUpdate(
      filter,
      { $inc: { walletBalance: delta } },
      { new: true, session },
    );
    if (!updatedReseller) {
      throw new AppError('Reseller not found or insufficient balance for debit.', 400);
    }

    const txNumber = await nextWalletTxNumber();
    const [tx] = await WalletTransactionModel.create(
      [
        {
          txNumber,
          reseller: updatedReseller._id,
          type: 'admin_adjustment',
          direction: input.direction,
          amount,
          balanceBefore: updatedReseller.walletBalance - delta,
          balanceAfter: updatedReseller.walletBalance,
          status: 'completed',
          note: input.note.trim(),
          processedBy: input.adminId as never,
          processedAt: new Date(),
        },
      ],
      { session },
    );
    return tx;
  });
}

export async function listAdminWalletTransactions(opts: { status?: WalletTxStatus; type?: WalletTxType } = {}) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (opts.status) filter.status = opts.status;
  if (opts.type) filter.type = opts.type;

  return WalletTransactionModel.find(filter)
    .populate('reseller', 'name shopName phone email')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
}

export async function listAdminSupportTickets(status?: TicketStatus) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  return SupportTicketModel.find(filter)
    .populate('reseller', 'name shopName phone email')
    .sort({ lastReplyAt: -1 })
    .limit(100)
    .lean();
}

export async function updateSupportTicketStatus(ticketId: string, status: TicketStatus) {
  await connectDB();
  const ticket = await SupportTicketModel.findById(ticketId);
  if (!ticket) throw new AppError('Support ticket not found.', 404);
  if (ticket.status === status) return ticket;
  const allowed = TICKET_STATUS_TRANSITIONS[ticket.status] ?? [];
  if (!allowed.includes(status)) {
    throw new AppError(`Cannot change ticket status from "${ticket.status}" to "${status}".`, 400);
  }
  ticket.status = status;
  await ticket.save();
  return ticket;
}

export async function getAdminResellerCounts() {
  await connectDB();
  const [total, active, inactive] = await Promise.all([
    ResellerModel.countDocuments(),
    ResellerModel.countDocuments({ isActive: true }),
    ResellerModel.countDocuments({ isActive: false }),
  ]);
  return { total, active, inactive };
}

export async function getAdminWalletTxCounts() {
  await connectDB();
  const [total, pending, completed, rejected] = await Promise.all([
    WalletTransactionModel.countDocuments(),
    WalletTransactionModel.countDocuments({ status: 'pending' }),
    WalletTransactionModel.countDocuments({ status: 'completed' }),
    WalletTransactionModel.countDocuments({ status: 'rejected' }),
  ]);
  return { total, pending, completed, rejected };
}

export async function getAdminTicketCounts() {
  await connectDB();
  const [total, open, in_progress, resolved] = await Promise.all([
    SupportTicketModel.countDocuments(),
    SupportTicketModel.countDocuments({ status: 'open' }),
    SupportTicketModel.countDocuments({ status: 'in_progress' }),
    SupportTicketModel.countDocuments({ status: { $in: ['resolved', 'closed'] } }),
  ]);
  return { total, open, in_progress, resolved };
}

export type ResellerLean = Reseller;
