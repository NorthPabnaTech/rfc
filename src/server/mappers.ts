import 'server-only';

import { sellerBasePrice } from '@lib/business/pricing';

import type {
  AppNotification,
  Category,
  Deposit,
  Earning,
  Expense,
  Order,
  PlatformSettings,
  Product,
  PublicProduct,
  Seller,
  SellerProduct,
  Supplier,
  SupportTicket,
  Transaction,
  Withdrawal,
} from '@/types/platform';

/*
 * Document → DTO. These are the ONLY shapes that leave the server, and the
 * seller/public variants are where admin-only data (supplier, supplier cost,
 * platform margin) is stripped — never on the client.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type D = Record<string, any>;
const id = (v: unknown) => String(v ?? '');
const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : '');

export const toCategory = (c: D): Category => ({
  id: id(c._id),
  name: c.name,
  nameBn: c.nameBn,
  slug: c.slug,
  icon: c.icon ?? 'box',
  description: c.description ?? '',
});

export const toSupplier = (s: D): Supplier => ({
  id: id(s._id),
  name: s.name,
  contactPerson: s.contactPerson ?? '',
  phone: s.phone ?? '',
  email: s.email ?? '',
  sourceUrl: s.sourceUrl ?? '',
  status: s.status,
  notes: s.notes ?? '',
  createdAt: iso(s.createdAt),
});

export const toProduct = (p: D): Product => ({
  id: id(p._id),
  name: p.name,
  nameBn: p.nameBn,
  slug: p.slug,
  description: p.description ?? '',
  images: p.images?.length ? p.images : ['art:0'],
  categoryId: id(p.categoryId),
  supplierId: id(p.supplierId),
  supplierCost: p.supplierCost,
  platformMargin: p.platformMargin,
  deliveryCharge: p.deliveryCharge ?? 0,
  packagingCharge: p.packagingCharge ?? 0,
  status: p.status,
  availability: p.availability,
  suggestedPrice: p.suggestedPrice ?? 0,
  createdAt: iso(p.createdAt),
});

export function toSellerProduct(p: D): SellerProduct {
  const full = toProduct(p);
  return {
    id: full.id,
    name: full.name,
    nameBn: full.nameBn,
    slug: full.slug,
    description: full.description,
    images: full.images,
    categoryId: full.categoryId,
    deliveryCharge: full.deliveryCharge,
    packagingCharge: full.packagingCharge,
    status: full.status,
    availability: full.availability,
    suggestedPrice: full.suggestedPrice,
    createdAt: full.createdAt,
    basePrice: sellerBasePrice(full),
  };
}

export const toPublicProduct = (p: D): PublicProduct => ({
  id: id(p._id),
  name: p.name,
  nameBn: p.nameBn,
  slug: p.slug,
  images: p.images?.length ? p.images : ['art:0'],
  categoryId: id(p.categoryId),
  availability: p.availability,
});

export const toSeller = (u: D): Seller => ({
  id: id(u._id),
  name: u.name,
  shopName: u.shopName ?? '',
  email: u.email,
  phone: u.phone ?? '',
  district: u.district ?? '',
  address: u.address ?? '',
  status: u.status,
  joinedAt: iso(u.createdAt),
  avatarColor: u.avatarColor ?? '#219ebc',
  payout: { method: u.payout?.method ?? 'bkash', account: u.payout?.account ?? '' },
});

/** Full order (admin). */
export const toOrder = (o: D): Order => ({
  id: o.orderNo,
  invoiceNo: o.invoiceNo,
  sellerId: id(o.sellerId),
  productId: id(o.productId),
  productName: o.productName,
  quantity: o.quantity,
  basePrice: o.basePrice,
  supplierCost: o.supplierCost,
  platformMargin: o.platformMargin,
  sellingPrice: o.sellingPrice,
  deliveryCharge: o.deliveryCharge,
  packagingCharge: o.packagingCharge,
  customer: {
    name: o.customer.name,
    phone: o.customer.phone,
    altPhone: o.customer.altPhone || undefined,
    address: o.customer.address,
    district: o.customer.district,
    upazila: o.customer.upazila,
    area: o.customer.area,
  },
  status: o.status,
  history: (o.history ?? []).map((h: D) => ({ status: h.status, at: iso(h.at), note: h.note })),
  trackingCode: o.trackingCode,
  courier: o.courier,
  note: o.note,
  createdAt: iso(o.createdAt),
  deliveredAt: o.deliveredAt ? iso(o.deliveredAt) : undefined,
});

/** Seller's view of their own order: supplier cost and platform margin removed. */
export const toSellerOrder = (o: D): Order => ({ ...toOrder(o), supplierCost: 0, platformMargin: 0 });

export const toTransaction = (t: D): Transaction => ({
  id: t.txNo,
  sellerId: id(t.sellerId),
  type: t.type,
  amount: t.amount,
  status: t.status,
  description: t.description ?? '',
  orderId: t.orderNo || undefined,
  createdAt: iso(t.createdAt),
});

export const toEarning = (e: D): Earning => ({
  id: id(e._id),
  sellerId: id(e.sellerId),
  orderId: e.orderNo,
  amount: e.amount,
  deliveredAt: iso(e.deliveredAt),
  releaseAt: iso(e.releaseAt),
  status: e.status,
});

export const toWithdrawal = (w: D): Withdrawal => ({
  id: w.withdrawalNo,
  sellerId: id(w.sellerId),
  amount: w.amount,
  fee: w.fee,
  method: w.method,
  account: w.account,
  status: w.status,
  requestedAt: iso(w.createdAt),
  processedAt: w.processedAt ? iso(w.processedAt) : undefined,
  note: w.note,
});

export const toDeposit = (d: D): Deposit => ({
  id: d.depositNo,
  sellerId: id(d.sellerId),
  amount: d.amount,
  method: d.method,
  reference: d.reference,
  status: d.status,
  createdAt: iso(d.createdAt),
});

export const toExpense = (e: D): Expense => ({
  id: id(e._id),
  title: e.title,
  category: e.category,
  amount: e.amount,
  date: iso(e.date),
  note: e.note,
});

export const toNotification = (n: D): AppNotification => ({
  id: id(n._id),
  audience: n.audience,
  sellerId: n.sellerId ? id(n.sellerId) : undefined,
  kind: n.kind,
  title: n.title,
  body: n.body ?? '',
  href: n.href,
  read: !!n.read,
  createdAt: iso(n.createdAt),
});

export const toTicket = (t: D): SupportTicket => ({
  id: t.ticketNo,
  sellerId: id(t.sellerId),
  subject: t.subject,
  message: t.message,
  status: t.status,
  priority: t.priority,
  createdAt: iso(t.createdAt),
});

export const toSettings = (s: D): PlatformSettings => ({
  platformName: s.platformName,
  contactEmail: s.contactEmail,
  supportPhone: s.supportPhone ?? '',
  currency: s.currency,
  timezone: s.timezone,
  defaultMargin: s.defaultMargin,
  defaultPackagingCharge: s.defaultPackagingCharge,
  deliveryCharges: {
    inside_dhaka: s.deliveryCharges.inside_dhaka,
    sub_dhaka: s.deliveryCharges.sub_dhaka,
    outside_dhaka: s.deliveryCharges.outside_dhaka,
  },
  minAddBalance: s.minAddBalance,
  minWithdrawal: s.minWithdrawal,
  withdrawalFees: {
    threshold: s.withdrawalFees.threshold,
    lowFee: s.withdrawalFees.lowFee,
    highFee: s.withdrawalFees.highFee,
    atThresholdFee: s.withdrawalFees.atThresholdFee,
  },
  earningsReleaseHours: s.earningsReleaseHours,
  telegramSupport: s.telegramSupport ?? '',
  telegramGroup: s.telegramGroup ?? '',
});
