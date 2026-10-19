import 'server-only';

import {
  connectDB,
  OrderModel,
  ProductModel,
  QuestionModel,
  ReturnRequestModel,
  UserModel,
} from '@/database';
import type { OrderRowDTO } from '@/types';

import { listAdminOrders } from './orders';

/** Orders that count as revenue: everything except cancelled/returned. */
const REVENUE_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'completed',
];
/** Orders whose money is actually in hand. */
const REALIZED_STATUSES = ['delivered', 'completed'];

export type DashboardData = {
  totals: {
    sales: number;
    realizedSales: number;
    profit: number;
    orders: number;
    products: number;
    customers: number;
    pendingOrders: number;
    deliveredOrders: number;
    openReturns: number;
    unansweredQuestions: number;
  };
  revenueByDay: { date: string; revenue: number; orders: number }[];
  byStatus: Record<string, number>;
  byPlatform: { platform: string; orders: number; revenue: number }[];
  topProducts: {
    id: string;
    name: string;
    slug: string;
    image?: string;
    quantity: number;
    revenue: number;
  }[];
  recentOrders: OrderRowDTO[];
};

export async function getDashboardData(days = 30): Promise<DashboardData> {
  await connectDB();
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const [
    salesAgg,
    realizedAgg,
    orders,
    products,
    customers,
    statusRows,
    daily,
    platformRows,
    top,
    openReturns,
    unanswered,
    recent,
  ] = await Promise.all([
    OrderModel.aggregate<{ total: number }>([
      { $match: { status: { $in: REVENUE_STATUSES } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    OrderModel.aggregate<{ total: number; profit: number }>([
      { $match: { status: { $in: REALIZED_STATUSES } } },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
          profit: {
            $sum: { $subtract: [{ $subtract: ['$total', '$shippingFee'] }, '$supplierCost'] },
          },
        },
      },
    ]),
    OrderModel.countDocuments(),
    ProductModel.countDocuments(),
    UserModel.countDocuments({ role: 'customer' }),
    OrderModel.aggregate<{ _id: string; n: number }>([
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]),
    OrderModel.aggregate<{ _id: string; revenue: number; orders: number }>([
      { $match: { createdAt: { $gte: since }, status: { $in: REVENUE_STATUSES } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Dhaka' },
          },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
    ]),
    OrderModel.aggregate<{ _id: string; orders: number; revenue: number }>([
      { $match: { status: { $in: REVENUE_STATUSES } } },
      { $group: { _id: '$platform', orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
      { $sort: { orders: -1 } },
    ]),
    OrderModel.aggregate<{
      _id: unknown;
      name: string;
      slug: string;
      image?: string;
      quantity: number;
      revenue: number;
    }>([
      { $match: { status: { $in: REVENUE_STATUSES } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $last: '$items.name' },
          slug: { $last: '$items.slug' },
          image: { $last: '$items.image' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.lineTotal' },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
    ]),
    ReturnRequestModel.countDocuments({ status: { $in: ['pending', 'approved', 'picked_up'] } }),
    QuestionModel.countDocuments({ answer: { $in: [null, ''] }, isHidden: false }),
    listAdminOrders({ page: 1 }),
  ]);

  const byStatus = Object.fromEntries(statusRows.map((r) => [r._id, r.n]));
  const dailyMap = new Map(daily.map((d) => [d._id, d]));
  const revenueByDay = Array.from({ length: days }, (_, i) => {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(d);
    const row = dailyMap.get(key);
    return { date: key, revenue: row?.revenue ?? 0, orders: row?.orders ?? 0 };
  });

  return {
    totals: {
      sales: salesAgg[0]?.total ?? 0,
      realizedSales: realizedAgg[0]?.total ?? 0,
      profit: realizedAgg[0]?.profit ?? 0,
      orders,
      products,
      customers,
      pendingOrders: byStatus.pending ?? 0,
      deliveredOrders: (byStatus.delivered ?? 0) + (byStatus.completed ?? 0),
      openReturns,
      unansweredQuestions: unanswered,
    },
    revenueByDay,
    byStatus,
    byPlatform: platformRows.map((p) => ({
      platform: p._id,
      orders: p.orders,
      revenue: p.revenue,
    })),
    topProducts: top.map((t) => ({
      id: String(t._id),
      name: t.name,
      slug: t.slug,
      image: t.image,
      quantity: t.quantity,
      revenue: t.revenue,
    })),
    recentOrders: recent.items.slice(0, 8),
  };
}

/** Counts shown as badges in the admin sidebar. */
export async function getAdminBadges() {
  await connectDB();
  const [pendingOrders, openReturns, unansweredQuestions] = await Promise.all([
    OrderModel.countDocuments({ status: 'pending' }),
    ReturnRequestModel.countDocuments({ status: 'pending' }),
    QuestionModel.countDocuments({ answer: { $in: [null, ''] }, isHidden: false }),
  ]);
  return { pendingOrders, openReturns, unansweredQuestions };
}
