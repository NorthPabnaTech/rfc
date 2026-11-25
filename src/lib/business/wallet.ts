import type {
  Earning,
  PlatformSettings,
  Transaction,
  TransactionType,
  Withdrawal,
  WithdrawalFeeRules,
} from '@/types/platform';

/* ─── Withdrawal fees ─────────────────────────────────────────────────────
 * Below the threshold (৳1,000): lowFee (৳5). Above it: highFee (৳10).
 * Exactly at the threshold the business has not decided yet, so it uses the
 * configurable `atThresholdFee` (Settings → Business → Withdrawal fee rules).
 */
export function withdrawalFee(amount: number, rules: WithdrawalFeeRules): number {
  if (!amount || amount <= 0) return 0;
  if (amount < rules.threshold) return rules.lowFee;
  if (amount > rules.threshold) return rules.highFee;
  return rules.atThresholdFee;
}

export type WithdrawalQuote = {
  amount: number;
  fee: number;
  net: number;
  error?: 'below_min' | 'insufficient' | 'empty';
};

export function quoteWithdrawal(
  amount: number,
  available: number,
  settings: Pick<PlatformSettings, 'minWithdrawal' | 'withdrawalFees'>,
): WithdrawalQuote {
  const fee = withdrawalFee(amount, settings.withdrawalFees);
  const net = Math.max(0, amount - fee);
  if (!amount || amount <= 0) return { amount: 0, fee: 0, net: 0, error: 'empty' };
  if (amount < settings.minWithdrawal) return { amount, fee, net, error: 'below_min' };
  if (amount > available) return { amount, fee, net, error: 'insufficient' };
  return { amount, fee, net };
}

/* ─── Wallet balances ─────────────────────────────────────────────────────
 * The ledger (transactions) is the source of truth.
 *   Available = completed credits/debits + pending debits (a pending
 *               withdrawal holds the money until it is approved or rejected)
 *   Pending   = delivered-order earnings still inside the release window
 */
export type WalletSummary = {
  available: number;
  pending: number;
  totalEarnings: number;
  totalWithdrawn: number;
  totalCharges: number;
  totalDeposited: number;
};

const CHARGE_TYPES = new Set(['delivery_charge', 'packaging_charge', 'withdrawal_fee']);

export function computeWallet(
  sellerId: string,
  transactions: Transaction[],
  earnings: Earning[],
  withdrawals: Withdrawal[],
): WalletSummary {
  let available = 0;
  let totalCharges = 0;
  let totalDeposited = 0;
  let refunds = 0;
  for (const t of transactions) {
    if (t.sellerId !== sellerId) continue;
    const counts = t.status === 'completed' || (t.status === 'pending' && t.amount < 0);
    if (counts) available += t.amount;
    if (t.status === 'completed' && CHARGE_TYPES.has(t.type)) totalCharges += -t.amount;
    if (t.status === 'completed' && t.type === 'refund') refunds += t.amount;
    if (t.status === 'completed' && t.type === 'add_balance') totalDeposited += t.amount;
  }
  let pending = 0;
  let totalEarnings = 0;
  for (const e of earnings) {
    if (e.sellerId !== sellerId) continue;
    totalEarnings += e.amount;
    if (e.status === 'pending') pending += e.amount;
  }
  const totalWithdrawn = withdrawals
    .filter((w) => w.sellerId === sellerId && w.status === 'completed')
    .reduce((s, w) => s + w.amount, 0);

  return {
    available,
    pending,
    totalEarnings,
    totalWithdrawn,
    totalCharges: totalCharges - refunds,
    totalDeposited,
  };
}

/** When a delivered order's earning becomes available. */
export function releaseDate(deliveredAt: string, releaseHours: number): string {
  return new Date(new Date(deliveredAt).getTime() + releaseHours * 3_600_000).toISOString();
}

/** Milliseconds left until release (0 when due). */
export function msUntilRelease(releaseAt: string, now = Date.now()): number {
  return Math.max(0, new Date(releaseAt).getTime() - now);
}

export const TX_TYPES: TransactionType[] = [
  'add_balance',
  'delivery_charge',
  'packaging_charge',
  'seller_earning',
  'withdrawal',
  'withdrawal_fee',
  'refund',
];
