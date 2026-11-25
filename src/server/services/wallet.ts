import 'server-only';

import { Types } from 'mongoose';

import { quoteWithdrawal, releaseDate, withdrawalFee } from '@lib/business/wallet';
import { AppError } from '@lib/errors';

import type { PaymentMethod, TransactionType, WithdrawalStatus } from '@/types/platform';

import { nextId, type Session, withTransaction } from '../db';
import { DepositModel, EarningModel, TransactionModel, UserModel, WithdrawalModel } from '../models';
import { notify } from './notify';
import { getSettings } from './settings';

/*
 * Wallet engine. The balance lives on the seller (`wallet.available`) and is
 * only ever changed here, with a conditional atomic update plus a ledger
 * entry in the same transaction:
 *   debit  → succeeds only if available ≥ amount (no negative balance, no
 *            double spend between two concurrent orders)
 *   credit → plain $inc
 * Pending withdrawals hold their amount (debited at request, re-credited on
 * rejection), matching the client's `computeWallet`.
 */

const oid = (id: string) => new Types.ObjectId(id);

export async function debit(sellerId: string, amount: number, session: Session) {
  if (amount <= 0) return;
  const res = await UserModel.updateOne(
    { _id: oid(sellerId), role: 'seller', 'wallet.available': { $gte: amount } },
    { $inc: { 'wallet.available': -amount } },
    { session },
  );
  if (res.modifiedCount !== 1) throw new AppError('Insufficient wallet balance.', 409);
}

export async function credit(sellerId: string, amount: number, session: Session) {
  if (amount <= 0) return;
  await UserModel.updateOne({ _id: oid(sellerId) }, { $inc: { 'wallet.available': amount } }, { session });
}

export async function ledger(
  e: {
    sellerId: string;
    type: TransactionType;
    amount: number;
    status?: 'completed' | 'pending' | 'failed';
    description: string;
    orderId?: unknown;
    orderNo?: string;
    withdrawalId?: unknown;
    depositId?: unknown;
  },
  session: Session,
) {
  const txNo = await nextId('TXN', 500000);
  const toId = (v: unknown) => (v ? new Types.ObjectId(String(v)) : undefined);
  await TransactionModel.create(
    [
      {
        status: e.status ?? 'completed',
        type: e.type,
        amount: e.amount,
        description: e.description,
        orderNo: e.orderNo,
        sellerId: oid(e.sellerId),
        orderId: toId(e.orderId),
        withdrawalId: toId(e.withdrawalId),
        depositId: toId(e.depositId),
        txNo,
      },
    ],
    { session },
  );
}

export async function availableBalance(sellerId: string): Promise<number> {
  const u = await UserModel.findById(sellerId, { wallet: 1 }).lean();
  return u?.wallet?.available ?? 0;
}

/* ─── Earnings ───────────────────────────────────────────────────────── */

export async function createPendingEarning(
  o: { _id: unknown; orderNo: string; sellerId: unknown; sellingPrice: number; basePrice: number; quantity: number },
  deliveredAt: Date,
  session: Session,
) {
  const { earningsReleaseHours } = await getSettings();
  const amount = (o.sellingPrice - o.basePrice) * o.quantity;
  await EarningModel.create(
    [
      {
        sellerId: new Types.ObjectId(String(o.sellerId)),
        orderId: new Types.ObjectId(String(o._id)),
        orderNo: o.orderNo,
        amount,
        deliveredAt,
        releaseAt: new Date(releaseDate(deliveredAt.toISOString(), earningsReleaseHours)),
        status: 'pending',
      },
    ],
    { session },
  );
}

/**
 * Moves due earnings (released 48 h after delivery) to available balance.
 * Idempotent: each earning flips pending→released exactly once, so it is
 * safe to call on every request (no cron needed).
 */
export async function releaseDueEarnings(sellerId?: string): Promise<number> {
  const due = await EarningModel.find({
    status: 'pending',
    releaseAt: { $lte: new Date() },
    ...(sellerId ? { sellerId: oid(sellerId) } : {}),
  })
    .limit(500)
    .lean();
  let released = 0;
  for (const e of due) {
    await withTransaction(async (session) => {
      const flip = await EarningModel.updateOne({ _id: e._id, status: 'pending' }, { $set: { status: 'released' } }, { session });
      if (flip.modifiedCount !== 1) return;
      await credit(String(e.sellerId), e.amount, session);
      await ledger(
        { sellerId: String(e.sellerId), type: 'seller_earning', amount: e.amount, description: `Earnings released · ${e.orderNo}`, orderId: e.orderId, orderNo: e.orderNo },
        session,
      );
      released++;
    });
    await notify({ audience: 'seller', sellerId: String(e.sellerId), kind: 'earning', title: 'Earnings released', body: `৳${e.amount} from ${e.orderNo} is now available.`, href: '/seller/wallet/earnings' });
  }
  return released;
}

/* ─── Deposits (Add Balance) ─────────────────────────────────────────── */

/**
 * Seller top-up. No payment gateway yet: the seller submits the bKash/Nagad/
 * Rocket/bank transaction id and an admin verifies it before the wallet is
 * credited.
 */
export async function createDeposit(
  seller: { id: string; name: string },
  input: { amount: number; method: PaymentMethod; reference: string; senderNumber?: string },
) {
  const { minAddBalance } = await getSettings();
  if (input.amount < minAddBalance) throw new AppError(`Minimum add balance is ৳${minAddBalance}.`, 422);
  const duplicate = await DepositModel.exists({ reference: input.reference, status: { $ne: 'failed' } });
  if (duplicate) throw new AppError('This transaction ID has already been submitted.', 409);
  const depositNo = await nextId('DEP', 70000);
  const [dep] = await DepositModel.create([{ ...input, sellerId: oid(seller.id), depositNo, status: 'pending' }]);
  await notify({ audience: 'admin', kind: 'payment', title: 'Balance top-up to verify', body: `${seller.name} sent ৳${input.amount} via ${input.method} (${input.reference}).`, href: '/admin/finance/add-balance' });
  return dep!;
}

export async function reviewDeposit(depositNo: string, decision: 'approve' | 'reject') {
  return withTransaction(async (session) => {
    const next = decision === 'approve' ? 'completed' : 'failed';
    const dep = await DepositModel.findOneAndUpdate({ depositNo, status: 'pending' }, { $set: { status: next } }, { session, new: true });
    if (!dep) throw new AppError('This top-up is no longer pending.', 409);
    const sellerId = String(dep.sellerId);
    if (decision === 'approve') {
      await credit(sellerId, dep.amount, session);
      await ledger({ sellerId, type: 'add_balance', amount: dep.amount, description: `Balance added via ${dep.method} (${dep.reference})`, depositId: dep._id }, session);
    }
    await notify(
      {
        audience: 'seller',
        sellerId,
        kind: 'payment',
        title: decision === 'approve' ? 'Balance added' : 'Top-up rejected',
        body: decision === 'approve' ? `৳${dep.amount} was added to your wallet.` : `Your top-up ${dep.reference} could not be verified.`,
        href: '/seller/wallet/transactions',
      },
      session,
    );
    return dep;
  });
}

/** Admin credits a wallet directly (verified offline payment, compensation…). */
export async function manualCredit(input: { sellerId: string; amount: number; method: PaymentMethod; reference: string }) {
  const { minAddBalance } = await getSettings();
  if (input.amount < minAddBalance) throw new AppError(`Minimum add balance is ৳${minAddBalance}.`, 422);
  const seller = await UserModel.exists({ _id: oid(input.sellerId), role: 'seller' });
  if (!seller) throw new AppError('Seller not found.', 404);
  return withTransaction(async (session) => {
    const depositNo = await nextId('DEP', 70000);
    const [dep] = await DepositModel.create(
      [{ ...input, sellerId: oid(input.sellerId), depositNo, status: 'completed', manual: true }],
      { session },
    );
    await credit(input.sellerId, input.amount, session);
    await ledger({ sellerId: input.sellerId, type: 'add_balance', amount: input.amount, description: `Balance added by admin (${input.reference})`, depositId: dep!._id }, session);
    await notify({ audience: 'seller', sellerId: input.sellerId, kind: 'payment', title: 'Balance added', body: `৳${input.amount} was added to your wallet.`, href: '/seller/wallet/transactions' }, session);
    return dep!;
  });
}

/* ─── Withdrawals ────────────────────────────────────────────────────── */

export async function requestWithdrawal(
  seller: { id: string; name: string },
  input: { amount: number; method: PaymentMethod; account: string },
) {
  const settings = await getSettings();
  const available = await availableBalance(seller.id);
  const q = quoteWithdrawal(input.amount, available, settings);
  if (q.error === 'below_min' || q.error === 'empty') throw new AppError(`Minimum withdrawal is ৳${settings.minWithdrawal}.`, 422);
  if (q.error === 'insufficient') throw new AppError('Amount exceeds your available balance.', 409);
  const fee = withdrawalFee(input.amount, settings.withdrawalFees);

  const w = await withTransaction(async (session) => {
    await debit(seller.id, input.amount, session); // hold the full amount
    const withdrawalNo = await nextId('WDR', 30000);
    const [doc] = await WithdrawalModel.create([{ ...input, fee, sellerId: oid(seller.id), withdrawalNo, status: 'pending' }], { session });
    await ledger({ sellerId: seller.id, type: 'withdrawal', amount: -(input.amount - fee), status: 'pending', description: `Withdrawal ${withdrawalNo} to ${input.method}`, withdrawalId: doc!._id }, session);
    await ledger({ sellerId: seller.id, type: 'withdrawal_fee', amount: -fee, status: 'pending', description: `Withdrawal fee · ${withdrawalNo}`, withdrawalId: doc!._id }, session);
    return doc!;
  });
  await notify({ audience: 'admin', kind: 'withdrawal', title: 'Withdrawal request', body: `${seller.name} requested ৳${input.amount}.`, href: '/admin/finance/withdrawals' });
  return w;
}

const W_TRANSITIONS: Record<WithdrawalStatus, WithdrawalStatus[]> = {
  pending: ['approved', 'rejected'],
  approved: ['completed', 'rejected'],
  rejected: [],
  completed: [],
};

export async function setWithdrawalStatus(withdrawalNo: string, status: WithdrawalStatus, note?: string) {
  return withTransaction(async (session) => {
    const current = await WithdrawalModel.findOne({ withdrawalNo }).session(session ?? null);
    if (!current) throw new AppError('Withdrawal not found.', 404);
    if (!W_TRANSITIONS[current.status as WithdrawalStatus].includes(status)) {
      throw new AppError(`A ${current.status} withdrawal cannot become ${status}.`, 409);
    }
    const updated = await WithdrawalModel.findOneAndUpdate(
      { _id: current._id, status: current.status },
      { $set: { status, processedAt: new Date(), ...(note ? { note } : {}) } },
      { session, new: true },
    );
    if (!updated) throw new AppError('This withdrawal was just updated. Refresh and try again.', 409);
    const txStatus = status === 'rejected' ? 'failed' : status === 'completed' ? 'completed' : 'pending';
    await TransactionModel.updateMany({ withdrawalId: current._id }, { $set: { status: txStatus } }, { session });
    if (status === 'rejected') await credit(String(current.sellerId), current.amount, session); // release the hold
    await notify(
      { audience: 'seller', sellerId: String(current.sellerId), kind: 'withdrawal', title: `Withdrawal ${status}`, body: `Your withdrawal of ৳${current.amount} is ${status}.${note ? ` ${note}` : ''}`, href: '/seller/wallet/withdraw' },
      session,
    );
    return updated;
  });
}
