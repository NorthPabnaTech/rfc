import { NextRequest, NextResponse } from 'next/server';

import { requireRequestUser } from '@/server/request-auth';
import { PLATFORM } from '@config/platform';
import { AppError } from '@lib/errors';
import { createPaymentlyCharge, isPaymentlyConfigured } from '@lib/payments/paymently';

/** Upper bound for one online top-up (guards against typos / abuse). */
const MAX_DEPOSIT = 500_000;

export async function POST(req: NextRequest) {
  try {
    if (!isPaymentlyConfigured()) {
      return NextResponse.json(
        { ok: false, error: 'Online payment gateway (UDDOKTA_PAY_API_KEY) is not configured.' },
        { status: 503 },
      );
    }

    // The reseller id, name and email come from the verified session — never the body.
    const user = await requireRequestUser(req, ['seller']);

    const body = (await req.json().catch(() => null)) as { amount?: number } | null;
    const amount = Number(body?.amount);
    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_DEPOSIT) {
      return NextResponse.json({ ok: false, error: 'Invalid deposit amount.' }, { status: 400 });
    }

    // Redirects go to the configured app URL, not the (spoofable) request host.
    const origin = (PLATFORM.appUrl || req.nextUrl.origin).replace(/\/+$/, '');
    const { paymentUrl } = await createPaymentlyCharge({
      fullName: user.name || 'Reseller',
      email: user.email || 'reseller@example.com',
      amount,
      metadata: {
        type: 'wallet_deposit',
        resellerId: user.id,
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
