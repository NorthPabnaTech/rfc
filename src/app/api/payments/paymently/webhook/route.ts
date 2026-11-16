import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { verifyAndCompletePaymentlyOrder } from '@/services/payments';
import { AppError } from '@lib/errors';
import { verifyWebhookSignature } from '@lib/payments/paymently';

export async function POST(req: NextRequest) {
  // 1. Authenticate webhook using Paymently's documented RT-UDDOKTAPAY-API-KEY header.
  const headerKey = req.headers.get('rt-uddoktapay-api-key');
  if (!verifyWebhookSignature(headerKey)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const invoiceId = typeof body?.invoice_id === 'string' ? body.invoice_id.trim() : '';
  if (!invoiceId) {
    return NextResponse.json({ ok: false, error: 'Missing invoice_id' }, { status: 400 });
  }

  try {
    // 2. Always verify independently via Paymently's server-to-server verify API.
    const result = await verifyAndCompletePaymentlyOrder({ invoiceId });
    if (result.verified) {
      revalidatePath('/admin', 'layout');
      revalidatePath('/account/orders');
      if (result.orderNumber) {
        revalidatePath(`/order-success/${result.orderNumber}`);
      }
    }
    return NextResponse.json({ ok: true, status: result.status, verified: result.verified });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: 'Webhook processing failed' }, { status: 500 });
  }
}
