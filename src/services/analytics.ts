import 'server-only';

import type { QueryFilter } from 'mongoose';

import {
  connectDB,
  type Expense,
  ExpenseModel,
  type Order,
  OrderModel,
} from '@/database';
import type { AnalysisDashboardDTO, AnalysisPeriod } from '@/types';
import { DEFAULT_BUSINESS_SLUG, ORDER_STATUSES, type OrderStatus } from '@lib/constants';
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
  const period = opts.period ?? 'month';

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
  const { fromDate, toDate, fromStr, toStr, granularity } = resolveDateRange(opts);
  const bFilter = businessMatch(business);

  const orderQuery: QueryFilter<Order> = {
    createdAt: { $gte: fromDate, $lte: toDate },
    ...(bFilter ? { business: bFilter } : {}),
  };

  const expenseQuery: QueryFilter<Expense> = {
    expenseDate: { $gte: fromDate, $lte: toDate },
    ...(bFilter ? { business: bFilter } : {}),
  };

  const dateFormat = granularity === 'month' ? '%Y-%m' : '%Y-%m-%d';

  const [orders, expenses, businesses] = await Promise.all([
    OrderModel.find(
      orderQuery,
      'business status total subtotal shippingFee discount supplierCost refundedAmount returnedItems createdAt',
    ).lean(),
    ExpenseModel.find(
      expenseQuery,
      'business category categoryName isCostOfGoods amount expenseDate',
    ).lean(),
    listBusinesses(),
  ]);

  // Compute order financial metrics accurately, accounting for partial & full returns.
  let grossRevenue = 0;
  let discounts = 0;
  let refunds = 0;
  let shippingFees = 0;
  let cogs = 0;
  let totalOrders = 0;
  let completedOrders = 0;
  let cancelledOrders = 0;
  let returnedOrders = 0;
  let validOrderCount = 0;

  const statusMap = new Map<OrderStatus, { count: number; revenue: number }>();
  for (const s of ORDER_STATUSES) statusMap.set(s, { count: 0, revenue: 0 });

  const timelineMap = new Map<
    string,
    { revenue: number; expenses: number; cogs: number; orders: number }
  >();
  const ensureSlot = (key: string) => {
    let slot = timelineMap.get(key);
    if (!slot) {
      slot = { revenue: 0, expenses: 0, cogs: 0, orders: 0 };
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

    if (o.status === 'delivered' || o.status === 'completed') completedOrders += 1;
    if (o.status === 'returned') returnedOrders += 1;

    validOrderCount += 1;
    const returnedCost = (o.returnedItems ?? []).reduce(
      (s, ri) => s + ri.supplierPrice * ri.quantity,
      0,
    );
    const returnedTotal = (o.returnedItems ?? []).reduce((s, ri) => s + ri.lineTotal, 0);
    const orderRefund =
      o.refundedAmount && o.refundedAmount > 0
        ? o.refundedAmount
        : o.status === 'returned'
          ? returnedTotal > 0
            ? returnedTotal
            : Math.max(0, o.total - o.shippingFee)
          : 0;

    const netOrderRev = Math.max(0, o.total - orderRefund);
    const netOrderCogs = Math.max(0, (o.supplierCost ?? 0) - returnedCost);

    grossRevenue += o.total;
    discounts += o.discount ?? 0;
    refunds += orderRefund;
    shippingFees += o.shippingFee ?? 0;
    cogs += netOrderCogs;

    stEntry.revenue += netOrderRev;

    bStat.revenue += netOrderRev;
    bStat.cogs += netOrderCogs;
    bStat.shipping += o.shippingFee ?? 0;
    bStat.orders += 1;

    const key = dayjs(o.createdAt)
      .tz(TZ)
      .format(granularity === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD');
    const slot = ensureSlot(key);
    slot.revenue += netOrderRev;
    slot.cogs += netOrderCogs;
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

      const key = dayjs(e.expenseDate)
        .tz(TZ)
        .format(granularity === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD');
      const slot = ensureSlot(key);
      slot.expenses += e.amount;
    }
  }

  const netRevenue = Math.max(0, grossRevenue - refunds);
  const grossProfit = netRevenue - shippingFees - cogs;
  const netProfit = grossProfit - operatingExpenses;
  const averageOrderValue = validOrderCount > 0 ? Math.round(netRevenue / validOrderCount) : 0;

  // Build continuous timeline across the selected date range.
  const timeline: AnalysisDashboardDTO['timeline'] = [];
  let cursor = dayjs.tz(fromStr, TZ).startOf(granularity);
  const endCursor = dayjs.tz(toStr, TZ).startOf(granularity);
  while (!cursor.isAfter(endCursor)) {
    const key = cursor.format(granularity === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD');
    const label = cursor.format(granularity === 'month' ? 'MMM YYYY' : 'DD MMM');
    const slot = timelineMap.get(key) ?? { revenue: 0, expenses: 0, cogs: 0, orders: 0 };
    timeline.push({
      key,
      label,
      revenue: slot.revenue,
      expenses: slot.expenses,
      cogs: slot.cogs,
      profit: slot.revenue - slot.cogs - slot.expenses,
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
  };
}
