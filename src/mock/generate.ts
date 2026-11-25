import type {
  AppNotification,
  Category,
  DeliveryArea,
  Deposit,
  Earning,
  Expense,
  Order,
  OrderEvent,
  OrderStatus,
  PlatformSettings,
  Product,
  Seller,
  Supplier,
  SupportTicket,
  Transaction,
  Withdrawal,
} from '@/types/platform';
import { sellerBasePrice } from '@lib/business/pricing';
import { releaseDate, withdrawalFee } from '@lib/business/wallet';

import { CATEGORIES, PRODUCTS, SUPPLIERS } from './catalog';
import { buildSellers, DEMO_SELLER_ID } from './people';
import { DEFAULT_SETTINGS } from './settings';

/*
 * Deterministic mock-data generator. Everything is derived from the same
 * seeded random stream and anchored to "now", so dates always look recent and
 * every number is internally consistent:
 *   orders → wallet charges / refunds → delivered earnings (48 h pending) →
 *   withdrawals → platform expenses (courier & packaging ≈ charges collected).
 */

export type PlatformData = {
  categories: Category[];
  suppliers: Supplier[];
  products: Product[];
  sellers: Seller[];
  orders: Order[];
  transactions: Transaction[];
  earnings: Earning[];
  withdrawals: Withdrawal[];
  deposits: Deposit[];
  expenses: Expense[];
  notifications: AppNotification[];
  tickets: SupportTicket[];
  settings: PlatformSettings;
};

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const CUSTOMER_FIRST = [
  'Rahim',
  'Karim',
  'Ayesha',
  'Fatema',
  'Jamal',
  'Shirin',
  'Habib',
  'Nasrin',
  'Sohel',
  'Rupa',
  'Masud',
  'Lipi',
  'Anwar',
  'Mitu',
  'Rashed',
  'Shapla',
  'Belal',
  'Ruma',
  'Zahid',
  'Keya',
];
const CUSTOMER_LAST = [
  'Uddin',
  'Mia',
  'Begum',
  'Khatun',
  'Hossain',
  'Akter',
  'Sarkar',
  'Chowdhury',
  'Sheikh',
  'Molla',
  'Talukder',
  'Biswas',
];
const ADDRESSES: { district: string; upazila: string; area: DeliveryArea }[] = [
  { district: 'Dhaka', upazila: 'Mirpur', area: 'inside_dhaka' },
  { district: 'Dhaka', upazila: 'Dhanmondi', area: 'inside_dhaka' },
  { district: 'Dhaka', upazila: 'Uttara', area: 'inside_dhaka' },
  { district: 'Dhaka', upazila: 'Badda', area: 'inside_dhaka' },
  { district: 'Dhaka', upazila: 'Mohammadpur', area: 'inside_dhaka' },
  { district: 'Dhaka', upazila: 'Savar', area: 'sub_dhaka' },
  { district: 'Gazipur', upazila: 'Gazipur Sadar', area: 'sub_dhaka' },
  { district: 'Narayanganj', upazila: 'Narayanganj Sadar', area: 'sub_dhaka' },
  { district: 'Chattogram', upazila: 'Patiya', area: 'outside_dhaka' },
  { district: 'Sylhet', upazila: 'Sylhet Sadar', area: 'outside_dhaka' },
  { district: 'Rajshahi', upazila: 'Paba', area: 'outside_dhaka' },
  { district: 'Khulna', upazila: 'Dumuria', area: 'outside_dhaka' },
  { district: 'Cumilla', upazila: 'Cumilla Sadar Dakshin', area: 'outside_dhaka' },
  { district: 'Bogura', upazila: 'Bogura Sadar', area: 'outside_dhaka' },
  { district: 'Rangpur', upazila: 'Rangpur Sadar', area: 'outside_dhaka' },
  { district: 'Mymensingh', upazila: 'Trishal', area: 'outside_dhaka' },
];
const COURIERS = ['Steadfast', 'Pathao', 'RedX'];

export function generatePlatformData(nowMs = Date.now()): PlatformData {
  const r = rng(20260601);
  const pick = <T>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)]!;
  const int = (min: number, max: number) => Math.floor(min + r() * (max - min + 1));
  const now = nowMs;
  const settings = { ...DEFAULT_SETTINGS };
  const sellers = buildSellers(now);
  const products = PRODUCTS.map((p) => ({ ...p }));
  const orderable = products.filter((p) => p.status === 'active');
  const selling = sellers.filter((s) => s.status !== 'pending');

  /* ── Orders ── */
  const orders: Order[] = [];
  const TOTAL = 720;
  for (let i = 0; i < TOTAL; i++) {
    // Growth curve: more orders in recent months.
    const ageDays = Math.floor(Math.pow(r(), 1.6) * 178);
    const createdAt = now - ageDays * DAY - int(0, 20) * HOUR - int(0, 59) * 60_000;
    const seller = r() < 0.12 ? sellers.find((s) => s.id === DEMO_SELLER_ID)! : pick(selling);
    if (createdAt < new Date(seller.joinedAt).getTime()) continue;
    const product = pick(orderable);
    const base = sellerBasePrice(product);
    const qty = r() < 0.75 ? 1 : r() < 0.7 ? 2 : 3;
    const sellingPrice = Math.max(
      base + 30,
      Math.round((product.suggestedPrice * (0.88 + r() * 0.2)) / 10) * 10,
    );
    const addr = pick(ADDRESSES);
    const deliveryCharge = settings.deliveryCharges[addr.area] + product.deliveryCharge;

    let status: OrderStatus;
    const roll = r();
    if (ageDays > 9) {
      status = roll < 0.8 ? 'delivered' : roll < 0.91 ? 'cancelled' : 'returned';
    } else if (ageDays > 4) {
      status =
        roll < 0.55
          ? 'delivered'
          : roll < 0.75
            ? 'out_for_delivery'
            : roll < 0.88
              ? 'shipped'
              : 'cancelled';
    } else if (ageDays > 1) {
      status =
        roll < 0.25
          ? 'delivered'
          : roll < 0.5
            ? 'shipped'
            : roll < 0.8
              ? 'confirmed'
              : roll < 0.92
                ? 'processing'
                : 'cancelled';
    } else {
      status = roll < 0.45 ? 'placed' : roll < 0.75 ? 'processing' : 'confirmed';
    }

    const path: OrderStatus[] = ['placed'];
    const flow: OrderStatus[] = [
      'processing',
      'confirmed',
      'shipped',
      'out_for_delivery',
      'delivered',
    ];
    if (status === 'cancelled') {
      const stop = int(0, 2);
      path.push(...flow.slice(0, stop), 'cancelled');
    } else if (status === 'returned') {
      path.push('processing', 'confirmed', 'shipped', 'out_for_delivery', 'returned');
    } else {
      path.push(...flow.slice(0, flow.indexOf(status as OrderStatus) + 1));
    }
    const history: OrderEvent[] = [];
    let t = createdAt;
    const maxT = Math.min(now - 30 * 60_000, createdAt + ageDays * DAY + 20 * HOUR);
    for (const st of path) {
      history.push({ status: st, at: new Date(Math.min(t, maxT)).toISOString() });
      t += int(4, 26) * HOUR;
    }
    const last = history[history.length - 1]!;
    const n = 10001 + orders.length;
    orders.push({
      id: `ORD-${n}`,
      invoiceNo: `INV-${new Date(createdAt).getFullYear()}-${n}`,
      sellerId: seller.id,
      productId: product.id,
      productName: product.name,
      quantity: qty,
      basePrice: base,
      supplierCost: product.supplierCost,
      platformMargin: product.platformMargin,
      sellingPrice,
      deliveryCharge,
      packagingCharge: product.packagingCharge,
      customer: {
        name: `${pick(CUSTOMER_FIRST)} ${pick(CUSTOMER_LAST)}`,
        phone: `01${int(3, 9)}${String(int(10_000_000, 99_999_999))}`,
        altPhone: r() < 0.3 ? `01${int(3, 9)}${String(int(10_000_000, 99_999_999))}` : undefined,
        address: `House ${int(1, 120)}, Road ${int(1, 30)}, Block ${pick(['A', 'B', 'C', 'D', 'E'])}`,
        district: addr.district,
        upazila: addr.upazila,
        area: addr.area,
      },
      status,
      history,
      courier: path.includes('shipped') ? pick(COURIERS) : undefined,
      trackingCode: path.includes('shipped') ? `TRK${int(100000, 999999)}` : undefined,
      createdAt: new Date(createdAt).toISOString(),
      deliveredAt: status === 'delivered' ? last.at : undefined,
    });
  }
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  /* ── Wallet ledger, simulated per seller in time order ── */
  const transactions: Transaction[] = [];
  const earnings: Earning[] = [];
  const withdrawals: Withdrawal[] = [];
  const deposits: Deposit[] = [];
  let txSeq = 1;
  const txId = () => `TXN-${String(500000 + txSeq++)}`;
  const iso = (ms: number) => new Date(ms).toISOString();

  for (const seller of sellers) {
    type Ev = { at: number; kind: 'order' | 'refund' | 'release'; order: Order };
    const evs: Ev[] = [];
    for (const o of orders) {
      if (o.sellerId !== seller.id) continue;
      evs.push({ at: new Date(o.createdAt).getTime(), kind: 'order', order: o });
      if (o.status === 'cancelled') {
        evs.push({
          at: new Date(o.history[o.history.length - 1]!.at).getTime(),
          kind: 'refund',
          order: o,
        });
      }
      if (o.status === 'delivered' && o.deliveredAt) {
        const rel = new Date(releaseDate(o.deliveredAt, settings.earningsReleaseHours)).getTime();
        evs.push({ at: rel, kind: 'release', order: o });
      }
    }
    evs.sort((a, b) => a.at - b.at);
    let balance = 0;
    const deposit = (at: number, amount: number) => {
      const method = seller.payout.method === 'bank' ? 'bkash' : seller.payout.method;
      const id = `DEP-${String(70000 + deposits.length)}`;
      deposits.push({
        id,
        sellerId: seller.id,
        amount,
        method,
        reference: `TX${int(1e7, 9e7)}`,
        status: 'completed',
        createdAt: iso(at),
      });
      transactions.push({
        id: txId(),
        sellerId: seller.id,
        type: 'add_balance',
        amount,
        status: 'completed',
        description: `Balance added via ${method}`,
        createdAt: iso(at),
      });
      balance += amount;
    };
    if (evs.length || seller.status !== 'pending') {
      deposit(new Date(seller.joinedAt).getTime() + 2 * HOUR, pick([500, 1000, 1500, 2000]));
    }

    for (const ev of evs) {
      const o = ev.order;
      if (ev.kind === 'order') {
        const need = o.deliveryCharge + o.packagingCharge;
        if (balance < need + 50) deposit(ev.at - int(1, 5) * HOUR, pick([500, 1000, 1500, 2000]));
        transactions.push({
          id: txId(),
          sellerId: seller.id,
          type: 'delivery_charge',
          amount: -o.deliveryCharge,
          status: 'completed',
          description: `Delivery charge · ${o.id}`,
          orderId: o.id,
          createdAt: iso(ev.at),
        });
        transactions.push({
          id: txId(),
          sellerId: seller.id,
          type: 'packaging_charge',
          amount: -o.packagingCharge,
          status: 'completed',
          description: `Packaging charge · ${o.id}`,
          orderId: o.id,
          createdAt: iso(ev.at),
        });
        balance -= need;
      } else if (ev.kind === 'refund') {
        const amount = o.deliveryCharge + o.packagingCharge;
        transactions.push({
          id: txId(),
          sellerId: seller.id,
          type: 'refund',
          amount,
          status: 'completed',
          description: `Charges refunded · ${o.id} cancelled`,
          orderId: o.id,
          createdAt: iso(ev.at),
        });
        balance += amount;
      } else {
        const amount = (o.sellingPrice - o.basePrice) * o.quantity;
        const released = ev.at <= now;
        earnings.push({
          id: `ERN-${o.id.slice(4)}`,
          sellerId: seller.id,
          orderId: o.id,
          amount,
          deliveredAt: o.deliveredAt!,
          releaseAt: iso(ev.at),
          status: released ? 'released' : 'pending',
        });
        if (!released) continue;
        transactions.push({
          id: txId(),
          sellerId: seller.id,
          type: 'seller_earning',
          amount,
          status: 'completed',
          description: `Earnings released · ${o.id}`,
          orderId: o.id,
          createdAt: iso(ev.at),
        });
        balance += amount;
        // Occasionally cash out.
        if (balance > 1800 && r() < 0.35) {
          const amt = Math.floor((balance * (0.4 + r() * 0.3)) / 100) * 100;
          const at = ev.at + int(2, 30) * HOUR;
          if (at > now) continue;
          const fee = withdrawalFee(amt, settings.withdrawalFees);
          const age = now - at;
          const st: Withdrawal['status'] =
            age < 2 * DAY
              ? 'pending'
              : age < 4 * DAY
                ? 'approved'
                : r() < 0.06
                  ? 'rejected'
                  : 'completed';
          const wid = `WDR-${String(30000 + withdrawals.length)}`;
          withdrawals.push({
            id: wid,
            sellerId: seller.id,
            amount: amt,
            fee,
            method: seller.payout.method,
            account: seller.payout.account,
            status: st,
            requestedAt: iso(at),
            processedAt: st === 'pending' ? undefined : iso(at + int(4, 30) * HOUR),
            note:
              st === 'rejected' ? 'Account number did not match the registered name.' : undefined,
          });
          const txStatus =
            st === 'rejected' ? 'failed' : st === 'completed' ? 'completed' : 'pending';
          transactions.push({
            id: txId(),
            sellerId: seller.id,
            type: 'withdrawal',
            amount: -(amt - fee),
            status: txStatus,
            description: `Withdrawal ${wid} to ${seller.payout.method}`,
            createdAt: iso(at),
          });
          transactions.push({
            id: txId(),
            sellerId: seller.id,
            type: 'withdrawal_fee',
            amount: -fee,
            status: txStatus,
            description: `Withdrawal fee · ${wid}`,
            createdAt: iso(at),
          });
          if (st !== 'rejected') balance -= amt;
        }
      }
    }
  }
  transactions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  withdrawals.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  deposits.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  /* ── Expenses: courier & packaging track the charges collected ── */
  const expenses: Expense[] = [];
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now);
    const start = new Date(d.getFullYear(), d.getMonth() - m, 1).getTime();
    const end = new Date(d.getFullYear(), d.getMonth() - m + 1, 1).getTime();
    const monthOrders = orders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= start && t < end && o.status !== 'cancelled';
    });
    const courier = Math.round(monthOrders.reduce((s, o) => s + o.deliveryCharge, 0) * 0.86);
    const packaging = Math.round(monthOrders.reduce((s, o) => s + o.packagingCharge, 0) * 0.7);
    const day = (n: number) => iso(Math.min(now - HOUR, start + n * DAY + 10 * HOUR));
    const add = (title: string, category: Expense['category'], amount: number, dayN: number) => {
      if (amount <= 0 || start + dayN * DAY > now) return;
      expenses.push({
        id: `EXP-${String(9000 + expenses.length)}`,
        title,
        category,
        amount,
        date: day(dayN),
      });
    };
    add('Courier payments (Steadfast / Pathao / RedX)', 'courier', courier, 27);
    add('Packaging materials (poly, boxes, tape)', 'packaging', packaging, 5);
    add('Facebook seller-acquisition ads', 'marketing', int(2500, 4500), 10);
    add('Hosting, domain & SMS gateway', 'software', 1200, 2);
    add('Co-working desk rent', 'office', 1800, 1);
    if (m % 2 === 0) add('Seller onboarding webinar', 'other', int(600, 1200), 18);
  }
  expenses.sort((a, b) => b.date.localeCompare(a.date));

  /* ── Notifications ── */
  const notifications: AppNotification[] = [];
  let nSeq = 1;
  const note = (n: Omit<AppNotification, 'id' | 'read'>, read: boolean) =>
    notifications.push({ ...n, id: `NTF-${nSeq++}`, read });
  const sellerName = (id: string) => sellers.find((s) => s.id === id)?.name ?? id;
  orders.slice(0, 6).forEach((o, i) =>
    note(
      {
        audience: 'admin',
        kind: 'order',
        title: `New order ${o.id}`,
        body: `${sellerName(o.sellerId)} placed an order for ${o.productName}.`,
        href: `/admin/orders/${o.id}`,
        createdAt: o.createdAt,
      },
      i > 2,
    ),
  );
  withdrawals
    .filter((w) => w.status === 'pending')
    .slice(0, 3)
    .forEach((w) =>
      note(
        {
          audience: 'admin',
          kind: 'withdrawal',
          title: 'Withdrawal request',
          body: `${sellerName(w.sellerId)} requested ৳${w.amount.toLocaleString('en-IN')}.`,
          href: '/admin/finance/withdrawals',
          createdAt: w.requestedAt,
        },
        false,
      ),
    );
  sellers
    .filter((s) => s.status === 'pending')
    .slice(0, 3)
    .forEach((s) =>
      note(
        {
          audience: 'admin',
          kind: 'account',
          title: 'New seller registration',
          body: `${s.name} (${s.shopName}) is waiting for approval.`,
          href: `/admin/sellers/${s.id}`,
          createdAt: s.joinedAt,
        },
        false,
      ),
    );
  const mine = orders.filter((o) => o.sellerId === DEMO_SELLER_ID);
  mine.slice(0, 5).forEach((o, i) =>
    note(
      {
        audience: 'seller',
        sellerId: DEMO_SELLER_ID,
        kind: 'status',
        title: `Order ${o.id} is ${o.status.replace(/_/g, ' ')}`,
        body: `${o.productName} × ${o.quantity} for ${o.customer.name}.`,
        href: `/seller/orders/${o.id}`,
        createdAt: o.history[o.history.length - 1]!.at,
      },
      i > 1,
    ),
  );
  earnings
    .filter((e) => e.sellerId === DEMO_SELLER_ID && e.status === 'released')
    .slice(-2)
    .forEach((e) =>
      note(
        {
          audience: 'seller',
          sellerId: DEMO_SELLER_ID,
          kind: 'earning',
          title: 'Earnings released',
          body: `৳${e.amount.toLocaleString('en-IN')} from ${e.orderId} moved to your available balance.`,
          href: '/seller/wallet/earnings',
          createdAt: e.releaseAt,
        },
        true,
      ),
    );
  deposits
    .filter((d) => d.sellerId === DEMO_SELLER_ID)
    .slice(0, 1)
    .forEach((d) =>
      note(
        {
          audience: 'seller',
          sellerId: DEMO_SELLER_ID,
          kind: 'payment',
          title: 'Balance added',
          body: `৳${d.amount.toLocaleString('en-IN')} was added to your wallet via ${d.method}.`,
          href: '/seller/wallet/transactions',
          createdAt: d.createdAt,
        },
        true,
      ),
    );
  note(
    {
      audience: 'seller',
      sellerId: DEMO_SELLER_ID,
      kind: 'account',
      title: 'Welcome aboard!',
      body: 'Your seller account is active. Browse the catalog and place your first order.',
      href: '/seller/products',
      createdAt: sellers[0]!.joinedAt,
    },
    true,
  );
  notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  /* ── Support tickets ── */
  const subjects: [string, string, SupportTicket['priority']][] = [
    [
      'Customer wants to change delivery address',
      'Order is confirmed but the customer moved to a new address in Mirpur 10. Can it be updated before shipping?',
      'high',
    ],
    [
      'Withdrawal not received yet',
      'My withdrawal was approved yesterday but I have not received it on bKash.',
      'high',
    ],
    [
      'Product size chart request',
      'Do you have a size chart for the Premium Cotton Polo T-Shirt?',
      'normal',
    ],
    [
      'How do I cancel an order?',
      'Customer changed their mind right after I placed the order.',
      'normal',
    ],
    ['Invoice logo question', 'Can I show my shop name on the invoice?', 'low'],
    [
      'Damaged product reported',
      'Customer says the kettle lid is cracked. What is the return process?',
      'high',
    ],
  ];
  const tickets: SupportTicket[] = subjects.map(([subject, message, priority], i) => ({
    id: `TKT-${2001 + i}`,
    sellerId: i < 2 ? DEMO_SELLER_ID : selling[(i * 3) % selling.length]!.id,
    subject,
    message,
    priority,
    status: i < 2 ? 'open' : i < 4 ? 'in_progress' : 'resolved',
    createdAt: iso(now - (i * 19 + 3) * HOUR),
  }));

  return {
    categories: CATEGORIES.map((c) => ({ ...c })),
    suppliers: SUPPLIERS.map((s) => ({ ...s })),
    products,
    sellers,
    orders,
    transactions,
    earnings,
    withdrawals,
    deposits,
    expenses,
    notifications,
    tickets,
    settings,
  };
}
