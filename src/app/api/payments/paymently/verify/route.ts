import { NextRequest, NextResponse } from 'next/server';

import { requireRequestUser } from '@/server/request-auth';
import { AppError } from '@lib/errors';
import {
  isPaymentlyConfigured,
  verifyPaymentlyInvoice,
  verifyWebhookSignature,
} from '@lib/payments/paymently';

/*
 * Two callers:
 *   • Paymently's webhook (signed with the RT-UDDOKTAPAY-API-KEY header):
 *     acknowledged only — the wallet lives in the reseller backend, which must
 *     verify the invoice itself before crediting.
 *   • The seller's browser after the redirect: the invoice is verified with
 *     Paymently server-to-server and must belong to the signed-in seller.
 */
export async function POST(req: NextRequest) {
  try {
    if (!isPaymentlyConfigured()) {
      return NextResponse.json(
        { ok: false, error: 'Online payment gateway is not configured.' },
        { status: 503 },
      );
    }

    if (verifyWebhookSignature(req.headers.get('rt-uddoktapay-api-key'))) {
      return NextResponse.json({ ok: true, received: true });
    }

    const user = await requireRequestUser(req, ['seller']);

    const body = (await req.json().catch(() => null)) as { invoiceId?: string } | null;
    const invoiceId = body?.invoiceId?.trim();
    if (!invoiceId || invoiceId.length > 100) {
      return NextResponse.json({ ok: false, error: 'Missing invoiceId.' }, { status: 400 });
    }

    const result = await verifyPaymentlyInvoice(invoiceId);
    const meta = result.metadata;
    if (meta.type !== 'wallet_deposit' || String(meta.resellerId ?? '') !== user.id) {
      return NextResponse.json(
        { ok: false, error: 'This payment does not belong to your account.' },
        { status: 403 },
      );
    }
    if (result.status === 'COMPLETED' && Number(meta.amount) !== result.amount) {
      return NextResponse.json(
        { ok: false, error: 'Payment amount does not match. Please contact support.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    const message = err instanceof AppError ? err.message : 'Unable to verify payment.';
    const status = err instanceof AppError ? err.status : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
