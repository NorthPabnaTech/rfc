import 'server-only';

import type { QueryFilter } from 'mongoose';

import {
  connectDB,
  type Expense,
  ExpenseModel,
  type Order,
  OrderModel,
  SupplierOrderModel,
} from '@/database';
import type { AnalysisDashboardDTO, AnalysisPeriod } from '@/types';
import {
  DEFAULT_BUSINESS_SLUG,
  ORDER_PLATFORM_LABELS,
  ORDER_STATUSES,
  type OrderPlatform,
  type OrderStatus,
} from '@lib/constants';
import { dayjs } from '@lib/utils';

import { listBusinesses } from './businesses';

const TZ = 'Asia/Dhaka';
const NON_CANCELLED_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'completed',
  'returned',
];

export function resolveDateRange(opts: {
  period?: AnalysisPeriod;
  date?: string;
  from?: string;
  to?: string;
}): { fromDate: Date; toDate: Date; fromStr: string; toStr: string; granularity: 'day' | 'month' } {
  const now = dayjs().tz(TZ);
  const period = opts.period ?? 'all';
  if (period === 'all') {
    return {
      fromDate: new Date(0),
      toDate: now.endOf('day').toDate(),
      fromStr: now.startOf('month').format('YYYY-MM-DD'),
      toStr: now.format('YYYY-MM-DD'),
      granularity: 'day',
    };
  }

  let start = now.startOf('month');
  let end = now.endOf('day');

  if (period === 'today') {
    start = now.startOf('day');
    end = now.endOf('day');
  } else if (period === 'week') {
    start = now.subtract(6, 'day').startOf('day');
    end = now.endOf('day');
  } else if (period === 'month') {
    start = now.startOf('month');
    end = now.endOf('day');
  } else if (period === 'year') {
    start = now.startOf('year');
    end = now.endOf('day');
  } else if (period === 'date' && opts.date) {
    const d = dayjs.tz(opts.date, TZ);
    if (d.isValid()) {
      start = d.startOf('day');
      end = d.endOf('day');
    }
  } else if (period === 'custom' && (opts.from || opts.to)) {
    const f = opts.from ? dayjs.tz(opts.from, TZ) : now.startOf('month');
    const t = opts.to ? dayjs.tz(opts.to, TZ) : now;
    if (f.isValid()) start = f.startOf('day');
    if (t.isValid()) end = t.endOf('day');
    if (end.isBefore(start)) end = start.endOf('day');
  }

  const diffDays = end.diff(start, 'day') + 1;
  const granularity: 'day' | 'month' = diffDays > 62 ? 'month' : 'day';

  return {
    fromDate: start.toDate(),
    toDate: end.toDate(),
    fromStr: start.format('YYYY-MM-DD'),
    toStr: end.format('YYYY-MM-DD'),
    granularity,
  };
}

function businessMatch(business: string) {
  if (!business || business === 'all') return undefined;
  return business === DEFAULT_BUSINESS_SLUG
    ? { $in: [DEFAULT_BUSINESS_SLUG, null] }
    : business;
}

export async function getAnalysisDashboard(opts: {
  period?: AnalysisPeriod;
  date?: string;
  from?: string;
  to?: string;
  business?: string;
}): Promise<AnalysisDashboardDTO> {
  await connectDB();
  const business = opts.business || 'all';
  const period = opts.business ? opts.period ?? 'all' : opts.period ?? 'all';
  const isAllTime = period === 'all';
  const resolved = resolveDateRange({ ...opts, period });
  const bFilter = businessMatch(business);

  const orderQuery: QueryFilter<Order> = {
    ...(isAllTime ? {} : { createdAt: { $gte: resolved.fromDate, $lte: resolved.toDate } }),
    ...(bFilter ? { business: bFilter } : {}),
  };

  const expenseQuery: QueryFilter<Expense> = {
    ...(isAllTime ? {} : { expenseDate: { $gte: resolved.fromDate, $lte: resolved.toDate } }),
    ...(bFilter ? { business: bFilter } : {}),
  };

  const [orders, expenses, businesses] = await Promise.all([
    OrderModel.find(
      orderQuery,
      'business platform status total subtotal shippingFee discount supplierCost refundedAmount returnedItems createdAt',
    ).lean(),
    ExpenseModel.find(
      expenseQuery,
      'business category categoryName isCostOfGoods amount expenseDate',
    ).lean(),
    listBusinesses(),
  ]);

  const deliveredOrderIds = orders
    .filter((o) => o.status === 'delivered' || o.status === 'completed')
    .map((o) => o._id);
  const supplierOrders = deliveredOrderIds.length
    ? await SupplierOrderModel.find(
        { order: { $in: deliveredOrderIds }, status: { $ne: 'cancelled' } },
        'order packagingCost deliveryCharge deliveryChargePaidByCustomer',
      ).lean()
    : [];
  const packagingByOrderId = new Map<string, number>();
  const resellerDeliveryByOrderId = new Map<string, number>();
  for (const so of supplierOrders) {
    const oid = String(so.order);
    packagingByOrderId.set(oid, (packagingByOrderId.get(oid) ?? 0) + (so.packagingCost ?? 0));
    if (so.deliveryChargePaidByCustomer === false) {
      resellerDeliveryByOrderId.set(
        oid,
        (resellerDeliveryByOrderId.get(oid) ?? 0) + (so.deliveryCharge ?? 0),
      );
    }
  }

  let fromStr = resolved.fromStr;
  let toStr = resolved.toStr;
  let granularity = resolved.granularity;

  if (isAllTime) {
    const allTimestamps = [
      ...orders.map((o) => new Date(o.createdAt).getTime()),
      ...expenses.map((e) => new Date(e.expenseDate).getTime()),
    ].filter((t) => Number.isFinite(t));

    if (allTimestamps.length > 0) {
      const minD = dayjs(Math.min(...allTimestamps)).tz(TZ);
      const maxD = dayjs(Math.max(...allTimestamps)).tz(TZ);
      fromStr = minD.format('YYYY-MM-DD');
      toStr = maxD.format('YYYY-MM-DD');
      granularity = maxD.diff(minD, 'day') + 1 > 62 ? 'month' : 'day';
    }
  }
  const dateFormat = granularity === 'month' ? '%Y-%m' : '%Y-%m-%d';

  // Compute order financial metrics accurately, accounting for partial & full returns.
  let grossRevenue = 0;
  let discounts = 0;
  let refunds = 0;
  let shippingFees = 0;
  let cogs = 0;
  let deliveredPackagingCost = 0;
  let totalOrders = 0;
  let completedOrders = 0;
  let cancelledOrders = 0;
  let returnedOrders = 0;
  let validOrderCount = 0;

  const statusMap = new Map<OrderStatus, { count: number; revenue: number }>();
  for (const s of ORDER_STATUSES) statusMap.set(s, { count: 0, revenue: 0 });
  const platformMap = new Map<OrderPlatform, { orders: number; revenue: number }>();

  const timelineMap = new Map<
    string,
    { revenue: number; expenses: number; cogs: number; profit: number; orders: number }
  >();
  const ensureSlot = (key: string) => {
    let slot = timelineMap.get(key);
    if (!slot) {
      slot = { revenue: 0, expenses: 0, cogs: 0, profit: 0, orders: 0 };
      timelineMap.set(key, slot);
    }
    return slot;
  };

  const bizMap = new Map<
    string,
    { revenue: number; cogs: number; expenses: number; orders: number; shipping: number }
  >();
  for (const b of businesses) {
    bizMap.set(b.slug, { revenue: 0, cogs: 0, expenses: 0, orders: 0, shipping: 0 });
  }

  for (const o of orders) {
    totalOrders += 1;
    const bSlug = o.business || DEFAULT_BUSINESS_SLUG;
    const bStat = bizMap.get(bSlug) ?? { revenue: 0, cogs: 0, expenses: 0, orders: 0, shipping: 0 };
    bizMap.set(bSlug, bStat);

    const stEntry = statusMap.get(o.status) ?? { count: 0, revenue: 0 };
    stEntry.count += 1;
    statusMap.set(o.status, stEntry);

    if (o.status === 'cancelled') {
      cancelledOrders += 1;
      continue;
    }

    if (o.status === 'returned') {
      returnedOrders += 1;
      const returnShipping = o.shippingFee ?? 0;
      shippingFees += returnShipping;
      const key = dayjs(o.createdAt)
        .tz(TZ)
        .format(granularity === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD');
      const slot = ensureSlot(key);
      // Delivery charge on a returned order is deducted from us and counts as a loss.
      slot.expenses += returnShipping;
      slot.orders += 1;
      continue;
    }

    const isDelivered = o.status === 'delivered' || o.status === 'completed';
    if (!isDelivered) {
      // Profit and revenue are only realized once the order is delivered/completed.
      continue;
    }

    completedOrders += 1;
    validOrderCount += 1;
    const returnedCost = (o.returnedItems ?? []).reduce(
      (s, ri) => s + ri.supplierPrice * ri.quantity,
      0,
    );
    const returnedTotal = (o.returnedItems ?? []).reduce((s, ri) => s + ri.lineTotal, 0);
    const orderRefund =
      o.refundedAmount && o.refundedAmount > 0 ? o.refundedAmount : returnedTotal;

    const netOrderRev = Math.max(0, o.total - orderRefund);
    const netOrderCogs = Math.max(0, (o.supplierCost ?? 0) - returnedCost);
    const resellerDelivery = resellerDeliveryByOrderId.get(String(o._id)) ?? 0;
    const orderShipping = resellerDelivery > 0 ? resellerDelivery : (o.shippingFee ?? 0);
    const orderPackaging = packagingByOrderId.get(String(o._id)) ?? 0;

    grossRevenue += o.total;
    discounts += o.discount ?? 0;
    refunds += orderRefund;
    shippingFees += orderShipping;
    cogs += netOrderCogs;
    deliveredPackagingCost += orderPackaging;

    stEntry.revenue += netOrderRev;
    const rawPlat = (o.platform ?? 'website') as OrderPlatform;
    const plat: OrderPlatform = rawPlat === 'messenger' ? 'facebook' : rawPlat;
    const pStat = platformMap.get(plat) ?? { orders: 0, revenue: 0 };
    pStat.orders += 1;
    pStat.revenue += netOrderRev;
    platformMap.set(plat, pStat);

    bStat.revenue += netOrderRev;
    bStat.cogs += netOrderCogs;
    bStat.shipping += orderShipping;
    bStat.orders += 1;

    const key = dayjs(o.createdAt)
      .tz(TZ)
      .format(granularity === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD');
    const slot = ensureSlot(key);
    slot.revenue += netOrderRev;
    slot.cogs += netOrderCogs + orderShipping;
    slot.profit += netOrderRev - orderShipping - netOrderCogs - orderPackaging;
    slot.orders += 1;
  }

  // Expenses: separate operating expenses from supplier purchase costs (COGS) to avoid double-counting.
  let operatingExpenses = 0;
  let supplierPurchaseExpenses = 0;
  const catMap = new Map<
    string,
    { categoryId: string; categoryName: string; isCostOfGoods: boolean; amount: number; count: number }
  >();

  for (const e of expenses) {
    const catId = String(e.category);
    const catEntry = catMap.get(catId) ?? {
      categoryId: catId,
      categoryName: e.categoryName,
      isCostOfGoods: e.isCostOfGoods,
      amount: 0,
      count: 0,
    };
    catEntry.amount += e.amount;
    catEntry.count += 1;
    catMap.set(catId, catEntry);

    if (e.isCostOfGoods) {
      supplierPurchaseExpenses += e.amount;
    } else {
      operatingExpenses += e.amount;
      const bSlug = e.business || DEFAULT_BUSINESS_SLUG;
      const bStat = bizMap.get(bSlug);
      if (bStat) bStat.expenses += e.amount;
    }

    const key = dayjs(e.expenseDate)
      .tz(TZ)
      .format(granularity === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD');
    const slot = ensureSlot(key);
    slot.expenses += e.amount;
  }

  const netRevenue = Math.max(0, grossRevenue - refunds);
  const grossProfit = netRevenue - shippingFees - cogs - deliveredPackagingCost;
  const netProfit = grossProfit - operatingExpenses;
  const averageOrderValue = validOrderCount > 0 ? Math.round(netRevenue / validOrderCount) : 0;

  // Build continuous timeline across the selected date range.
  const timeline: AnalysisDashboardDTO['timeline'] = [];
  let cursor = dayjs.tz(fromStr, TZ).startOf(granularity);
  const endCursor = dayjs.tz(toStr, TZ).startOf(granularity);
  while (!cursor.isAfter(endCursor)) {
    const key = cursor.format(granularity === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD');
    const label = cursor.format(granularity === 'month' ? 'MMM YYYY' : 'DD MMM');
    const slot = timelineMap.get(key) ?? { revenue: 0, expenses: 0, cogs: 0, profit: 0, orders: 0 };
    timeline.push({
      key,
      label,
      revenue: slot.revenue,
      expenses: slot.expenses,
      cogs: slot.cogs,
      profit: slot.profit,
      orders: slot.orders,
    });
    cursor = cursor.add(1, granularity);
  }

  // Silence unused constant lint if needed
  void NON_CANCELLED_STATUSES;
  void dateFormat;

  return {
    range: { from: fromStr, to: toStr, granularity },
    business,
    summary: {
      grossRevenue,
      discounts,
      refunds,
      netRevenue,
      shippingFees,
      cogs,
      grossProfit,
      operatingExpenses,
      supplierPurchaseExpenses,
      netProfit,
      totalOrders,
      completedOrders,
      cancelledOrders,
      returnedOrders,
      averageOrderValue,
    },
    timeline,
    ordersByStatus: ORDER_STATUSES.map((status) => ({
      status,
      count: statusMap.get(status)?.count ?? 0,
      revenue: statusMap.get(status)?.revenue ?? 0,
    })).filter((r) => r.count > 0),
    expenseByCategory: [...catMap.values()].sort((a, b) => b.amount - a.amount),
    businessBreakdown: businesses.map((b) => {
      const s = bizMap.get(b.slug) ?? {
        revenue: 0,
        cogs: 0,
        expenses: 0,
        orders: 0,
        shipping: 0,
      };
      return {
        slug: b.slug,
        name: b.name,
        revenue: s.revenue,
        cogs: s.cogs,
        expenses: s.expenses,
        netProfit: s.revenue - s.shipping - s.cogs - s.expenses,
        orders: s.orders,
      };
    }),
    platformBreakdown: (
      ['website', 'facebook', 'instagram', 'tiktok', 'whatsapp', 'other'] as const
    )
      .map((platform) => {
        const stat = platformMap.get(platform) ?? { orders: 0, revenue: 0 };
        return {
          platform,
          label: ORDER_PLATFORM_LABELS[platform] ?? platform,
          orders: stat.orders,
          revenue: stat.revenue,
        };
      })
      .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders),
  };
}
