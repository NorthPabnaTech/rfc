'use client';

import * as React from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { generatePlatformData, type PlatformData } from '@/mock/generate';
import { DEMO_ADMIN, DEMO_SELLER_ID } from '@/mock/people';
import type {
  AppNotification,
  Category,
  DeliveryArea,
  Expense,
  Order,
  OrderStatus,
  PaymentMethod,
  PlatformSettings,
  Product,
  Role,
  Seller,
  SellerStatus,
  Supplier,
  SupportTicket,
  TicketStatus,
  Transaction,
  WithdrawalStatus,
} from '@/types/platform';
import { ORDER_TRANSITIONS } from '@lib/business/orders';
import { sellerBasePrice } from '@lib/business/pricing';
import { computeWallet, releaseDate, withdrawalFee } from '@lib/business/wallet';

/*
 * Phase 1 demo store — the single client-side "backend".
 *
 * Holds the mock data and every mutation the UI can perform, persisted to
 * localStorage so a demo survives reloads (Settings → Reset demo data restores
 * it). In Phase 2 each action becomes an API call (see src/lib/api) and the
 * server enforces the same rules; components already only talk to these
 * actions and selectors, never to the raw mock files.
 */

export type DemoSession = { role: Role; userId: string; name: string; email: string } | null;

export type PlaceOrderInput = {
  sellerId: string;
  productId: string;
  quantity: number;
  sellingPrice: number;
  area: DeliveryArea;
  customer: Order['customer'];
  note?: string;
};

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

type Actions = {
  login: (role: Role) => void;
  logout: () => void;
  placeOrder: (input: PlaceOrderInput) => Result<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => Result;
  releaseDueEarnings: () => number;
  addBalance: (
    sellerId: string,
    amount: number,
    method: PaymentMethod,
    reference: string,
  ) => Result<string>;
  requestWithdrawal: (
    sellerId: string,
    amount: number,
    method: PaymentMethod,
    account: string,
  ) => Result<string>;
  setWithdrawalStatus: (id: string, status: WithdrawalStatus, note?: string) => Result;
  setSellerStatus: (id: string, status: SellerStatus) => void;
  updateSeller: (id: string, patch: Partial<Seller>) => void;
  upsertProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  upsertCategory: (c: Category) => void;
  deleteCategory: (id: string) => Result;
  upsertSupplier: (s: Supplier) => void;
  deleteSupplier: (id: string) => Result;
  addExpense: (e: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;
  updateSettings: (patch: Partial<PlatformSettings>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (audience: Role, sellerId?: string) => void;
  createTicket: (t: Omit<SupportTicket, 'id' | 'createdAt' | 'status'>) => void;
  setTicketStatus: (id: string, status: TicketStatus) => void;
  updateAdminProfile: (patch: Partial<typeof DEMO_ADMIN>) => void;
  resetDemo: () => void;
};

export type PlatformState = PlatformData & {
  session: DemoSession;
  admin: typeof DEMO_ADMIN;
  generatedAt: string;
} & Actions;

const iso = () => new Date().toISOString();
const rid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296)
    .toString(36)
    .toUpperCase()
    .padStart(2, '0')}`;

function freshData() {
  return { ...generatePlatformData(), generatedAt: iso(), admin: { ...DEMO_ADMIN } };
}

export const usePlatformStore = create<PlatformState>()(
  persist(
    (set, get) => {
      const notify = (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) =>
        set((s) => ({
          notifications: [
            { ...n, id: rid('NTF'), read: false, createdAt: iso() },
            ...s.notifications,
          ],
        }));
      const addTx = (t: Omit<Transaction, 'id' | 'createdAt'>) =>
        set((s) => ({
          transactions: [{ ...t, id: rid('TXN'), createdAt: iso() }, ...s.transactions],
        }));
      const walletOf = (sellerId: string) => {
        const s = get();
        return computeWallet(sellerId, s.transactions, s.earnings, s.withdrawals);
      };

      return {
        ...freshData(),
        session: null,

        login: (role) => {
          if (role === 'admin') {
            const a = get().admin;
            set({ session: { role, userId: a.id, name: a.name, email: a.email } });
          } else {
            const seller = get().sellers.find((x) => x.id === DEMO_SELLER_ID)!;
            set({ session: { role, userId: seller.id, name: seller.name, email: seller.email } });
          }
        },
        logout: () => set({ session: null }),

        placeOrder: (input) => {
          const s = get();
          const product = s.products.find((p) => p.id === input.productId);
          if (!product || product.status !== 'active')
            return { ok: false, error: 'product_unavailable' };
          const base = sellerBasePrice(product);
          if (input.sellingPrice < base) return { ok: false, error: 'below_base' };
          if (input.quantity < 1) return { ok: false, error: 'quantity' };
          // Charges are recomputed here, never taken from the form.
          const deliveryCharge = s.settings.deliveryCharges[input.area] + product.deliveryCharge;
          const packagingCharge = product.packagingCharge;
          const charges = deliveryCharge + packagingCharge;
          if (walletOf(input.sellerId).available < charges)
            return { ok: false, error: 'insufficient' };

          const maxNo = s.orders.reduce((m, o) => Math.max(m, Number(o.id.slice(4)) || 0), 10000);
          const n = maxNo + 1;
          const now = iso();
          const order: Order = {
            id: `ORD-${n}`,
            invoiceNo: `INV-${new Date().getFullYear()}-${n}`,
            sellerId: input.sellerId,
            productId: product.id,
            productName: product.name,
            quantity: input.quantity,
            basePrice: base,
            supplierCost: product.supplierCost,
            platformMargin: product.platformMargin,
            sellingPrice: input.sellingPrice,
            deliveryCharge,
            packagingCharge,
            customer: { ...input.customer, area: input.area },
            status: 'placed',
            history: [{ status: 'placed', at: now }],
            note: input.note,
            createdAt: now,
          };
          set((st) => ({ orders: [order, ...st.orders] }));
          // Deduct delivery + packaging exactly once, at placement.
          addTx({
            sellerId: input.sellerId,
            type: 'delivery_charge',
            amount: -deliveryCharge,
            status: 'completed',
            description: `Delivery charge · ${order.id}`,
            orderId: order.id,
          });
          addTx({
            sellerId: input.sellerId,
            type: 'packaging_charge',
            amount: -packagingCharge,
            status: 'completed',
            description: `Packaging charge · ${order.id}`,
            orderId: order.id,
          });
          const seller = s.sellers.find((x) => x.id === input.sellerId);
          notify({
            audience: 'admin',
            kind: 'order',
            title: `New order ${order.id}`,
            body: `${seller?.name ?? 'A seller'} placed an order for ${product.name}.`,
            href: `/admin/orders/${order.id}`,
          });
          return { ok: true, data: order };
        },

        updateOrderStatus: (orderId, status, note) => {
          const s = get();
          const order = s.orders.find((o) => o.id === orderId);
          if (!order) return { ok: false, error: 'not_found' };
          if (!ORDER_TRANSITIONS[order.status].includes(status))
            return { ok: false, error: 'transition' };
          const now = iso();
          const patch: Partial<Order> = {
            status,
            history: [...order.history, { status, at: now, note }],
          };
          if (status === 'shipped' && !order.trackingCode) {
            patch.trackingCode = `TRK${Math.floor(100000 + Math.random() * 899999)}`;
            patch.courier = 'Steadfast';
          }
          if (status === 'delivered') patch.deliveredAt = now;
          set((st) => ({
            orders: st.orders.map((o) => (o.id === orderId ? { ...o, ...patch } : o)),
          }));

          if (status === 'delivered') {
            const amount = (order.sellingPrice - order.basePrice) * order.quantity;
            set((st) => ({
              earnings: [
                {
                  id: rid('ERN'),
                  sellerId: order.sellerId,
                  orderId,
                  amount,
                  deliveredAt: now,
                  releaseAt: releaseDate(now, st.settings.earningsReleaseHours),
                  status: 'pending',
                },
                ...st.earnings,
              ],
            }));
          }
          if (status === 'cancelled') {
            addTx({
              sellerId: order.sellerId,
              type: 'refund',
              amount: order.deliveryCharge + order.packagingCharge,
              status: 'completed',
              description: `Charges refunded · ${orderId} cancelled`,
              orderId,
            });
          }
          notify({
            audience: 'seller',
            sellerId: order.sellerId,
            kind: 'status',
            title: `Order ${orderId} is ${status.replace(/_/g, ' ')}`,
            body: `${order.productName} × ${order.quantity} for ${order.customer.name}.`,
            href: `/seller/orders/${orderId}`,
          });
          return { ok: true, data: undefined };
        },

        releaseDueEarnings: () => {
          const now = Date.now();
          const due = get().earnings.filter(
            (e) => e.status === 'pending' && new Date(e.releaseAt).getTime() <= now,
          );
          if (!due.length) return 0;
          const ids = new Set(due.map((e) => e.id));
          set((st) => ({
            earnings: st.earnings.map((e) => (ids.has(e.id) ? { ...e, status: 'released' } : e)),
          }));
          for (const e of due) {
            addTx({
              sellerId: e.sellerId,
              type: 'seller_earning',
              amount: e.amount,
              status: 'completed',
              description: `Earnings released · ${e.orderId}`,
              orderId: e.orderId,
            });
            notify({
              audience: 'seller',
              sellerId: e.sellerId,
              kind: 'earning',
              title: 'Earnings released',
              body: `৳${e.amount} from ${e.orderId} is now available.`,
              href: '/seller/wallet/earnings',
            });
          }
          return due.length;
        },

        addBalance: (sellerId, amount, method, reference) => {
          const { minAddBalance } = get().settings;
          if (!Number.isFinite(amount) || amount < minAddBalance)
            return { ok: false, error: 'below_min' };
          const id = rid('DEP');
          set((st) => ({
            deposits: [
              { id, sellerId, amount, method, reference, status: 'completed', createdAt: iso() },
              ...st.deposits,
            ],
          }));
          addTx({
            sellerId,
            type: 'add_balance',
            amount,
            status: 'completed',
            description: `Balance added via ${method}`,
          });
          notify({
            audience: 'seller',
            sellerId,
            kind: 'payment',
            title: 'Balance added',
            body: `৳${amount} was added to your wallet.`,
            href: '/seller/wallet/transactions',
          });
          return { ok: true, data: id };
        },

        requestWithdrawal: (sellerId, amount, method, account) => {
          const s = get();
          if (amount < s.settings.minWithdrawal) return { ok: false, error: 'below_min' };
          if (amount > walletOf(sellerId).available) return { ok: false, error: 'insufficient' };
          const fee = withdrawalFee(amount, s.settings.withdrawalFees);
          const id = rid('WDR');
          set((st) => ({
            withdrawals: [
              { id, sellerId, amount, fee, method, account, status: 'pending', requestedAt: iso() },
              ...st.withdrawals,
            ],
          }));
          addTx({
            sellerId,
            type: 'withdrawal',
            amount: -(amount - fee),
            status: 'pending',
            description: `Withdrawal ${id} to ${method}`,
          });
          addTx({
            sellerId,
            type: 'withdrawal_fee',
            amount: -fee,
            status: 'pending',
            description: `Withdrawal fee · ${id}`,
          });
          const seller = s.sellers.find((x) => x.id === sellerId);
          notify({
            audience: 'admin',
            kind: 'withdrawal',
            title: 'Withdrawal request',
            body: `${seller?.name ?? 'A seller'} requested ৳${amount}.`,
            href: '/admin/finance/withdrawals',
          });
          return { ok: true, data: id };
        },

        setWithdrawalStatus: (id, status, note) => {
          const w = get().withdrawals.find((x) => x.id === id);
          if (!w) return { ok: false, error: 'not_found' };
          const allowed: Record<WithdrawalStatus, WithdrawalStatus[]> = {
            pending: ['approved', 'rejected'],
            approved: ['completed', 'rejected'],
            rejected: [],
            completed: [],
          };
          if (!allowed[w.status].includes(status)) return { ok: false, error: 'transition' };
          const txStatus: Transaction['status'] =
            status === 'rejected' ? 'failed' : status === 'completed' ? 'completed' : 'pending';
          set((st) => ({
            withdrawals: st.withdrawals.map((x) =>
              x.id === id ? { ...x, status, note: note ?? x.note, processedAt: iso() } : x,
            ),
            transactions: st.transactions.map((t) =>
              t.description.includes(id) && (t.type === 'withdrawal' || t.type === 'withdrawal_fee')
                ? { ...t, status: txStatus }
                : t,
            ),
          }));
          notify({
            audience: 'seller',
            sellerId: w.sellerId,
            kind: 'withdrawal',
            title: `Withdrawal ${status}`,
            body: `Your withdrawal of ৳${w.amount} is ${status}.`,
            href: '/seller/wallet/withdraw',
          });
          return { ok: true, data: undefined };
        },

        setSellerStatus: (id, status) => {
          set((st) => ({ sellers: st.sellers.map((x) => (x.id === id ? { ...x, status } : x)) }));
          notify({
            audience: 'seller',
            sellerId: id,
            kind: 'account',
            title: `Account ${status}`,
            body: `Your seller account status is now ${status}.`,
          });
        },
        updateSeller: (id, patch) =>
          set((st) => ({
            sellers: st.sellers.map((x) => (x.id === id ? { ...x, ...patch } : x)),
            session:
              st.session?.userId === id
                ? {
                    ...st.session,
                    name: patch.name ?? st.session.name,
                    email: patch.email ?? st.session.email,
                  }
                : st.session,
          })),

        upsertProduct: (p) =>
          set((st) => ({
            products: st.products.some((x) => x.id === p.id)
              ? st.products.map((x) => (x.id === p.id ? p : x))
              : [p, ...st.products],
          })),
        deleteProduct: (id) => set((st) => ({ products: st.products.filter((p) => p.id !== id) })),
        upsertCategory: (c) =>
          set((st) => ({
            categories: st.categories.some((x) => x.id === c.id)
              ? st.categories.map((x) => (x.id === c.id ? c : x))
              : [...st.categories, c],
          })),
        deleteCategory: (id) => {
          if (get().products.some((p) => p.categoryId === id))
            return { ok: false, error: 'in_use' };
          set((st) => ({ categories: st.categories.filter((c) => c.id !== id) }));
          return { ok: true, data: undefined };
        },
        upsertSupplier: (sup) =>
          set((st) => ({
            suppliers: st.suppliers.some((x) => x.id === sup.id)
              ? st.suppliers.map((x) => (x.id === sup.id ? sup : x))
              : [sup, ...st.suppliers],
          })),
        deleteSupplier: (id) => {
          if (get().products.some((p) => p.supplierId === id))
            return { ok: false, error: 'in_use' };
          set((st) => ({ suppliers: st.suppliers.filter((x) => x.id !== id) }));
          return { ok: true, data: undefined };
        },
        addExpense: (e) =>
          set((st) => ({
            expenses: [{ ...e, id: rid('EXP') }, ...st.expenses].sort((a, b) =>
              b.date.localeCompare(a.date),
            ),
          })),
        deleteExpense: (id) => set((st) => ({ expenses: st.expenses.filter((e) => e.id !== id) })),
        updateSettings: (patch) => set((st) => ({ settings: { ...st.settings, ...patch } })),

        markNotificationRead: (id) =>
          set((st) => ({
            notifications: st.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
          })),
        markAllNotificationsRead: (audience, sellerId) =>
          set((st) => ({
            notifications: st.notifications.map((n) =>
              n.audience === audience && (audience === 'admin' || n.sellerId === sellerId)
                ? { ...n, read: true }
                : n,
            ),
          })),

        createTicket: (t) =>
          set((st) => ({
            tickets: [{ ...t, id: rid('TKT'), status: 'open', createdAt: iso() }, ...st.tickets],
          })),
        setTicketStatus: (id, status) =>
          set((st) => ({ tickets: st.tickets.map((t) => (t.id === id ? { ...t, status } : t)) })),
        updateAdminProfile: (patch) =>
          set((st) => ({
            admin: { ...st.admin, ...patch },
            session:
              st.session?.role === 'admin'
                ? {
                    ...st.session,
                    name: patch.name ?? st.session.name,
                    email: patch.email ?? st.session.email,
                  }
                : st.session,
          })),
        resetDemo: () => set((st) => ({ ...freshData(), session: st.session })),
      };
    },
    {
      name: 'resell-demo-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Functions are not persisted; everything else is the demo "database".
      partialize: (s) => {
        const data = Object.fromEntries(
          Object.entries(s).filter(([, v]) => typeof v !== 'function'),
        );
        return data as Partial<PlatformState>;
      },
    },
  ),
);

/* ─── Hooks ──────────────────────────────────────────────────────────── */

/** True once the persisted demo data has loaded in the browser. */
export function useStoreHydrated() {
  return React.useSyncExternalStore(
    (cb) => usePlatformStore.persist.onFinishHydration(cb),
    () => usePlatformStore.persist.hasHydrated(),
    () => false,
  );
}

export function useSession() {
  return usePlatformStore((s) => s.session);
}

/** The signed-in seller (demo: always the demo seller record). */
export function useCurrentSeller(): Seller | undefined {
  const id = usePlatformStore((s) =>
    s.session?.role === 'seller' ? s.session.userId : DEMO_SELLER_ID,
  );
  return usePlatformStore((s) => s.sellers.find((x) => x.id === id));
}

export function useWallet(sellerId: string | undefined) {
  const transactions = usePlatformStore((s) => s.transactions);
  const earnings = usePlatformStore((s) => s.earnings);
  const withdrawals = usePlatformStore((s) => s.withdrawals);
  return React.useMemo(
    () => computeWallet(sellerId ?? '', transactions, earnings, withdrawals),
    [sellerId, transactions, earnings, withdrawals],
  );
}

/** Release due earnings on load and every minute while the app is open. */
export function useEarningsReleaser() {
  const release = usePlatformStore((s) => s.releaseDueEarnings);
  React.useEffect(() => {
    release();
    const t = window.setInterval(release, 60_000);
    return () => window.clearInterval(t);
  }, [release]);
}
