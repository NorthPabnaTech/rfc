import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  createResellerDepositRequest,
  creditResellerDepositFromInvoice,
} from '@/services/resellers';
import {
  requireReseller,
  resellerError,
  resellerJson,
  resellerOptionsResponse,
} from '@lib/auth/reseller-auth';
import { MIN_RESELLER_DEPOSIT } from '@lib/constants';
import { AppError } from '@lib/errors';

/** Paid through Paymently: only the invoice id is trusted; the amount comes from the gateway. */
const invoiceDepositSchema = z.object({
  invoiceId: z.string().trim().min(1).max(120),
});

/**
 * Legacy manual request (bank transfer etc.): creates a PENDING deposit only.
 * It never credits the wallet; an admin must review and approve it.
 */
const manualDepositSchema = z.object({
  amount: z
    .number()
    .int('Amount must be a whole number.')
    .min(MIN_RESELLER_DEPOSIT, `Minimum add balance is ৳${MIN_RESELLER_DEPOSIT}.`)
    .max(1_000_000),
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
  const resellerId = String(auth.reseller._id);

  try {
    const body: unknown = await req.json();

    if (body && typeof body === 'object' && 'invoiceId' in body) {
      const parsed = invoiceDepositSchema.safeParse(body);
      if (!parsed.success) return resellerError('A valid invoiceId is required.', 400);

      const { tx, walletBalance, alreadyCredited } = await creditResellerDepositFromInvoice({
        invoiceId: parsed.data.invoiceId,
        resellerId,
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
            invoiceId: tx.invoiceId ?? null,
            walletBalance,
            alreadyCredited,
            createdAt: tx.createdAt,
          },
        },
        alreadyCredited ? 200 : 201,
      );
    }

    const parsed = manualDepositSchema.safeParse(body);
    if (!parsed.success) {
      return resellerError(parsed.error.issues[0]?.message ?? 'Invalid deposit request.', 400);
    }
    const tx = await createResellerDepositRequest({
      resellerId,
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
          invoiceId: null,
          alreadyCredited: false,
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
