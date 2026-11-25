import { NextRequest, NextResponse } from 'next/server';

import { creditResellerDepositFromInvoice } from '@/services/resellers';
import { AppError } from '@lib/errors';
import { verifyWebhookSignature } from '@lib/payments/paymently';

/**
 * POST /api/reseller/wallet/deposit/webhook — Paymently webhook for wallet
 * deposits (set it as `webhook_url` when creating the invoice), so the wallet
 * is credited even if the seller closes the tab.
 *
 * Authenticated by a timing-safe compare of the `RT-UDDOKTAPAY-API-KEY`
 * header. The body is only used for the invoice id: the payment is always
 * re-verified server-to-server and credited idempotently.
 */
export async function POST(req: NextRequest) {
  if (!verifyWebhookSignature(req.headers.get('rt-uddoktapay-api-key'))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let invoiceId = '';
  try {
    const body = (await req.json()) as Record<string, unknown>;
    invoiceId = typeof body?.invoice_id === 'string' ? body.invoice_id.trim() : '';
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  if (!invoiceId) {
    return NextResponse.json({ ok: false, error: 'Missing invoice_id' }, { status: 400 });
  }

  try {
    const { tx, alreadyCredited } = await creditResellerDepositFromInvoice({ invoiceId });
    return NextResponse.json({ ok: true, data: { txNumber: tx.txNumber, alreadyCredited } });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    console.error('[reseller-deposit-webhook]', err);
    return NextResponse.json({ ok: false, error: 'Webhook processing failed' }, { status: 500 });
  }
}
