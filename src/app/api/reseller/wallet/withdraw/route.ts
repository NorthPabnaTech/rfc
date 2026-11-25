import { NextRequest } from 'next/server';
import { z } from 'zod';

import { requestResellerWithdrawal } from '@/services/resellers';
import {
  requireReseller,
  resellerError,
  resellerJson,
  resellerOptionsResponse,
} from '@lib/auth/reseller-auth';
import { MIN_RESELLER_WITHDRAWAL } from '@lib/constants';
import { AppError } from '@lib/errors';

const withdrawSchema = z.object({
  amount: z
    .number()
    .int('Amount must be a whole number.')
    .min(MIN_RESELLER_WITHDRAWAL, `Minimum withdrawal is ৳${MIN_RESELLER_WITHDRAWAL}.`),
  payoutMethod: z.string().trim().min(2).max(40),
  payoutAccount: z.string().trim().min(4).max(200),
  note: z.string().trim().max(300).optional(),
});

export function OPTIONS() {
  return resellerOptionsResponse();
}

export async function POST(req: NextRequest) {
  const auth = await requireReseller(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = withdrawSchema.safeParse(body);
    if (!parsed.success) {
      return resellerError(parsed.error.issues[0]?.message ?? 'Invalid withdrawal request.', 400);
    }

    const { tx, walletBalance } = await requestResellerWithdrawal({
      resellerId: String(auth.reseller._id),
      amount: parsed.data.amount,
      payoutMethod: parsed.data.payoutMethod,
      payoutAccount: parsed.data.payoutAccount,
      note: parsed.data.note,
    });

    return resellerJson(
      {
        ok: true,
        data: {
          id: String(tx._id),
          txNumber: tx.txNumber,
          amount: tx.amount,
          fee: tx.fee ?? 0,
          netAmount: tx.netAmount ?? tx.amount,
          status: tx.status,
          payoutMethod: tx.payoutMethod,
          payoutAccount: tx.payoutAccount,
          walletBalance,
          createdAt: tx.createdAt,
        },
      },
      201,
    );
  } catch (err) {
    if (err instanceof AppError) return resellerError(err.message, err.status);
    return resellerError('Failed to submit withdrawal request.', 500);
  }
}
