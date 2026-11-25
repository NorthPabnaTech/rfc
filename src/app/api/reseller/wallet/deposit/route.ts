import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  requireReseller,
  resellerError,
  resellerJson,
  resellerOptionsResponse,
} from '@lib/auth/reseller-auth';
import { MIN_RESELLER_DEPOSIT } from '@lib/constants';
import { AppError } from '@lib/errors';
import { createResellerDepositRequest } from '@/services/resellers';

const depositSchema = z.object({
  amount: z.number().min(MIN_RESELLER_DEPOSIT, `Minimum add balance is ৳${MIN_RESELLER_DEPOSIT}.`),
  paymentMethod: z.string().trim().max(40).optional(),
  paymentReference: z.string().trim().max(120).optional(),
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
    const parsed = depositSchema.safeParse(body);
    if (!parsed.success) {
      return resellerError(parsed.error.issues[0]?.message ?? 'Invalid deposit request.', 400);
    }

    const tx = await createResellerDepositRequest({
      resellerId: String(auth.reseller._id),
      amount: parsed.data.amount,
      paymentMethod: parsed.data.paymentMethod,
      paymentReference: parsed.data.paymentReference,
      note: parsed.data.note,
    });

    return resellerJson(
      {
        ok: true,
        data: {
          id: String(tx._id),
          txNumber: tx.txNumber,
          amount: tx.amount,
          status: tx.status,
          paymentMethod: tx.paymentMethod ?? null,
          paymentReference: tx.paymentReference ?? null,
          createdAt: tx.createdAt,
        },
      },
      201,
    );
  } catch (err) {
    if (err instanceof AppError) return resellerError(err.message, err.status);
    return resellerError('Failed to submit deposit request.', 500);
  }
}
