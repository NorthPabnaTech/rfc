import { NextRequest, NextResponse } from 'next/server';

import { AppError } from '@lib/errors';
import { createPaymentlyCharge, isPaymentlyConfigured } from '@lib/payments/paymently';

export async function POST(req: NextRequest) {
  try {
    if (!isPaymentlyConfigured()) {
      return NextResponse.json(
        { ok: false, error: 'Online payment gateway (UDDOKTA_PAY_API_KEY) is not configured.' },
        { status: 503 },
      );
    }

    const body = (await req.json()) as {
      amount?: number;
      fullName?: string;
      email?: string;
      resellerId?: string;
    };

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 1) {
      return NextResponse.json({ ok: false, error: 'Invalid deposit amount.' }, { status: 400 });
    }

    const origin = req.nextUrl.origin;
    const { paymentUrl } = await createPaymentlyCharge({
      fullName: (body.fullName || 'Reseller').trim(),
      email: (body.email || 'reseller@example.com').trim(),
      amount,
      metadata: {
        type: 'wallet_deposit',
        resellerId: String(body.resellerId || ''),
        amount: String(amount),
      },
      redirectUrl: `${origin}/seller/wallet/add-balance?paymently=success`,
      cancelUrl: `${origin}/seller/wallet/add-balance?paymently=cancelled`,
      webhookUrl: `${origin}/api/payments/paymently/verify`,
    });

    return NextResponse.json({ ok: true, paymentUrl });
  } catch (err) {
    const message = err instanceof AppError ? err.message : 'Could not start online payment.';
    const status = err instanceof AppError ? err.status : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
