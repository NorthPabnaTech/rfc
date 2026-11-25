import type { Expense, Order, OrderStatus, Withdrawal } from '@/types/platform';

import { ORDER_STATUSES, orderMoney } from './orders';

/* ─── Date ranges ─────────────────────────────────────────────────────── */

export type RangeKey = 'all' | 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'custom';

export const RANGE_KEYS: RangeKey[] = ['all', 'today', 'yesterday', '7d', '30d', 'month', 'custom'];

export type DateRange = { from: number | null; to: number | null };

const DAY = 86_400_000;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function resolveRange(
  key: RangeKey,
  custom?: { from?: string; to?: string },
  now = new Date(),
): DateRange {
  const today = startOfDay(now);
  switch (key) {
    case 'today':
      return { from: today, to: today + DAY - 1 };
    case 'yesterday':
      return { from: today - DAY, to: today - 1 };
    case '7d':
      return { from: today - 6 * DAY, to: today + DAY - 1 };
    case '30d':
      return { from: today - 29 * DAY, to: today + DAY - 1 };
    case 'month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return { from: first, to: today + DAY - 1 };
    }
    case 'custom': {
      const from = custom?.from ? startOfDay(new Date(custom.from)) : null;
      const to = custom?.to ? startOfDay(new Date(custom.to)) + DAY - 1 : null;
      return { from, to };
    }
    default:
      return { from: null, to: null };
  }
}

export function inRange(iso: string | undefined, r: DateRange): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return (r.from === null || t >= r.from) && (r.to === null || t <= r.to);
}

/* ─── Financials ──────────────────────────────────────────────────────────
 * One consistent model, used by the dashboard, Business Analysis and
 * Platform Revenue:
 *   Revenue (GMV)    = Σ selling × qty of delivered orders
 *                    = Product cost + Platform profit + Seller profit
 *   Charges income   = delivery + packaging prepaid by sellers (non-cancelled)
 *   Net profit       = Platform profit + charges income + withdrawal fees
 *                      − operating expenses (courier, packaging, salary…)
 */
export type Financials = {
  revenue: number;
  productCost: number;
  platformProfit: number;
  sellerProfit: number;
  deliveryCharges: number;
  packagingCharges: number;
  withdrawalFees: number;
  expenses: number;
  /** Everything the platform earns before expenses. */
  platformIncome: number;
  netProfit: number;
  orders: number;
  delivered: number;
};

export function computeFinancials(
  data: { orders: Order[]; expenses: Expense[]; withdrawals: Withdrawal[] },
  range: DateRange = { from: null, to: null },
): Financials {
  const f: Financials = {
    revenue: 0,
    productCost: 0,
    platformProfit: 0,
    sellerProfit: 0,
    deliveryCharges: 0,
    packagingCharges: 0,
    withdrawalFees: 0,
    expenses: 0,
    platformIncome: 0,
    netProfit: 0,
    orders: 0,
    delivered: 0,
  };
  for (const o of data.orders) {
    if (inRange(o.createdAt, range)) {
      f.orders += 1;
      if (o.status !== 'cancelled') {
        f.deliveryCharges += o.deliveryCharge;
        f.packagingCharges += o.packagingCharge;
      }
    }
    if (o.status === 'delivered' && inRange(o.deliveredAt, range)) {
      const m = orderMoney(o);
      f.delivered += 1;
      f.revenue += m.subtotal;
      f.productCost += m.supplierTotal;
      f.platformProfit += m.platformProfit;
      f.sellerProfit += m.sellerProfit;
    }
  }
  for (const w of data.withdrawals) {
    if ((w.status === 'completed' || w.status === 'approved') && inRange(w.requestedAt, range)) {
      f.withdrawalFees += w.fee;
    }
  }
  for (const e of data.expenses) if (inRange(e.date, range)) f.expenses += e.amount;

  f.platformIncome = f.platformProfit + f.deliveryCharges + f.packagingCharges + f.withdrawalFees;
  f.netProfit = f.platformIncome - f.expenses;
  return f;
}

/* ─── Series ──────────────────────────────────────────────────────────── */

export type MonthPoint = {
  key: string;
  /** Month index 0–11 + year, formatted by the UI in the active language. */
  month: number;
  year: number;
  revenue: number;
  expenses: number;
  platformProfit: number;
  sellerProfit: number;
  platformIncome: number;
  netProfit: number;
  orders: number;
  delivered: number;
  cancelled: number;
  returned: number;
};

export function monthlySeries(
  data: { orders: Order[]; expenses: Expense[]; withdrawals: Withdrawal[] },
  months = 6,
  now = new Date(),
  sellerId?: string,
): MonthPoint[] {
  const out: MonthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).getTime() - 1;
    const range = { from: start.getTime(), to: end };
    const orders = sellerId ? data.orders.filter((o) => o.sellerId === sellerId) : data.orders;
    const fin = computeFinancials(
      { orders, expenses: sellerId ? [] : data.expenses, withdrawals: data.withdrawals },
      range,
    );
    const created = orders.filter((o) => inRange(o.createdAt, range));
    out.push({
      key: `${start.getFullYear()}-${start.getMonth()}`,
      month: start.getMonth(),
      year: start.getFullYear(),
      revenue: fin.revenue,
      expenses: fin.expenses,
      platformProfit: fin.platformProfit,
      sellerProfit: fin.sellerProfit,
      platformIncome: fin.platformIncome,
      netProfit: fin.netProfit,
      orders: created.length,
      delivered: created.filter((o) => o.status === 'delivered').length,
      cancelled: created.filter((o) => o.status === 'cancelled').length,
      returned: created.filter((o) => o.status === 'returned').length,
    });
  }
  return out;
}

export type DayPoint = { key: string; date: string; sales: number; orders: number; profit: number };

export function dailySeries(orders: Order[], days = 14, now = new Date()): DayPoint[] {
  const today = startOfDay(now);
  const out: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const from = today - i * DAY;
    const range = { from, to: from + DAY - 1 };
    const list = orders.filter((o) => inRange(o.createdAt, range) && o.status !== 'cancelled');
    out.push({
      key: String(from),
      date: new Date(from).toISOString(),
      sales: list.reduce((s, o) => s + o.sellingPrice * o.quantity, 0),
      orders: list.length,
      profit: list.reduce((s, o) => s + o.platformMargin * o.quantity, 0),
    });
  }
  return out;
}

export function statusBreakdown(orders: Order[]): { status: OrderStatus; count: number }[] {
  return ORDER_STATUSES.map((status) => ({
    status,
    count: orders.filter((o) => o.status === status).length,
  })).filter((r) => r.count > 0);
}

export function topProducts(orders: Order[], limit = 5) {
  const map = new Map<string, { productId: string; name: string; qty: number; revenue: number }>();
  for (const o of orders) {
    if (o.status === 'cancelled') continue;
    const row = map.get(o.productId) ?? {
      productId: o.productId,
      name: o.productName,
      qty: 0,
      revenue: 0,
    };
    row.qty += o.quantity;
    row.revenue += o.sellingPrice * o.quantity;
    map.set(o.productId, row);
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, limit);
}
