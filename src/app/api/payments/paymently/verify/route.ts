import { NextRequest, NextResponse } from 'next/server';

import { AppError } from '@lib/errors';
import { isPaymentlyConfigured, verifyPaymentlyInvoice } from '@lib/payments/paymently';

export async function POST(req: NextRequest) {
  try {
    if (!isPaymentlyConfigured()) {
      return NextResponse.json(
        { ok: false, error: 'Online payment gateway is not configured.' },
        { status: 503 },
      );
    }

    const body = (await req.json()) as { invoiceId?: string };
    const invoiceId = body.invoiceId?.trim();
    if (!invoiceId) {
      return NextResponse.json({ ok: false, error: 'Missing invoiceId.' }, { status: 400 });
    }

    const result = await verifyPaymentlyInvoice(invoiceId);
    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    const message = err instanceof AppError ? err.message : 'Unable to verify payment.';
    const status = err instanceof AppError ? err.status : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
