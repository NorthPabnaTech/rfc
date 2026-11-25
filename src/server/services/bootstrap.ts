import 'server-only';

import { Types } from 'mongoose';

import * as m from '../mappers';
import {
  CategoryModel,
  DepositModel,
  EarningModel,
  ExpenseModel,
  NotificationModel,
  OrderModel,
  ProductModel,
  SupplierModel,
  TicketModel,
  TransactionModel,
  UserModel,
  WithdrawalModel,
} from '../models';
import type { SessionUser } from '../session';
import { getPublicSettings, getSettings } from './settings';
import { releaseDueEarnings } from './wallet';

/*
 * Role-scoped snapshot for the dashboard client store.
 *   admin  → everything (full product costs, all sellers, all orders…)
 *   seller → only their own records; products WITHOUT supplier cost, margin
 *            or supplier; orders WITHOUT the cost snapshot.
 * Due earnings are released first, so balances are always current.
 *
 * Phase 2 note: fine for thousands of rows; move the large lists to paged
 * endpoints once the platform outgrows that.
 */
export async function bootstrap(user: SessionUser) {
  if (user.role === 'admin') {
    await releaseDueEarnings();
    const [categories, suppliers, products, sellers, orders, transactions, earnings, withdrawals, deposits, expenses, notifications, tickets, settings, admin] =
      await Promise.all([
        CategoryModel.find().sort({ sort: 1, createdAt: 1 }).lean(),
        SupplierModel.find().sort({ createdAt: -1 }).lean(),
        ProductModel.find().sort({ createdAt: -1 }).lean(),
        UserModel.find({ role: 'seller' }).sort({ createdAt: -1 }).lean(),
        OrderModel.find().sort({ createdAt: -1 }).lean(),
        TransactionModel.find().sort({ createdAt: -1 }).lean(),
        EarningModel.find().sort({ deliveredAt: -1 }).lean(),
        WithdrawalModel.find().sort({ createdAt: -1 }).lean(),
        DepositModel.find().sort({ createdAt: -1 }).lean(),
        ExpenseModel.find().sort({ date: -1 }).lean(),
        NotificationModel.find({ audience: 'admin' }).sort({ createdAt: -1 }).limit(100).lean(),
        TicketModel.find().sort({ createdAt: -1 }).lean(),
        getSettings(),
        UserModel.findById(user.id).lean(),
      ]);
    return {
      role: 'admin' as const,
      categories: categories.map(m.toCategory),
      suppliers: suppliers.map(m.toSupplier),
      products: products.map(m.toProduct),
      sellerProducts: [],
      sellers: sellers.map(m.toSeller),
      orders: orders.map(m.toOrder),
      transactions: transactions.map(m.toTransaction),
      earnings: earnings.map(m.toEarning),
      withdrawals: withdrawals.map(m.toWithdrawal),
      deposits: deposits.map(m.toDeposit),
      expenses: expenses.map(m.toExpense),
      notifications: notifications.map(m.toNotification),
      tickets: tickets.map(m.toTicket),
      settings,
      admin: { id: user.id, name: admin?.name ?? user.name, email: admin?.email ?? user.email, phone: admin?.phone ?? '', role: 'Super Admin' },
    };
  }

  await releaseDueEarnings(user.id);
  const sid = new Types.ObjectId(user.id);
  const [categories, products, me, orders, transactions, earnings, withdrawals, deposits, notifications, tickets, publicSettings] =
    await Promise.all([
      CategoryModel.find().sort({ sort: 1, createdAt: 1 }).lean(),
      ProductModel.find({ status: { $ne: 'draft' } }).sort({ createdAt: -1 }).lean(),
      UserModel.findById(user.id).lean(),
      OrderModel.find({ sellerId: sid }).sort({ createdAt: -1 }).lean(),
      TransactionModel.find({ sellerId: sid }).sort({ createdAt: -1 }).lean(),
      EarningModel.find({ sellerId: sid }).sort({ deliveredAt: -1 }).lean(),
      WithdrawalModel.find({ sellerId: sid }).sort({ createdAt: -1 }).lean(),
      DepositModel.find({ sellerId: sid }).sort({ createdAt: -1 }).lean(),
      NotificationModel.find({ audience: 'seller', sellerId: sid }).sort({ createdAt: -1 }).limit(100).lean(),
      TicketModel.find({ sellerId: sid }).sort({ createdAt: -1 }).lean(),
      getPublicSettings(),
    ]);
  return {
    role: 'seller' as const,
    categories: categories.map(m.toCategory),
    suppliers: [],
    products: [],
    sellerProducts: products.map(m.toSellerProduct),
    sellers: me ? [m.toSeller(me)] : [],
    orders: orders.map(m.toSellerOrder),
    transactions: transactions.map(m.toTransaction),
    earnings: earnings.map(m.toEarning),
    withdrawals: withdrawals.map(m.toWithdrawal),
    deposits: deposits.map(m.toDeposit),
    expenses: [],
    notifications: notifications.map(m.toNotification),
    tickets: tickets.map(m.toTicket),
    // Sellers never receive the default platform margin.
    settings: { ...publicSettings, currency: 'BDT', timezone: 'Asia/Dhaka', defaultMargin: 0, defaultPackagingCharge: 0 },
    admin: null,
  };
}

export type BootstrapData = Awaited<ReturnType<typeof bootstrap>>;

/** Price-free catalog for the public site. */
export async function publicCatalog() {
  const [categories, products, settings] = await Promise.all([
    CategoryModel.find().sort({ sort: 1, createdAt: 1 }).lean(),
    ProductModel.find({ status: { $ne: 'draft' } }).sort({ createdAt: -1 }).lean(),
    getPublicSettings(),
  ]);
  return {
    categories: categories.map(m.toCategory),
    products: products.map(m.toPublicProduct),
    settings,
  };
}
