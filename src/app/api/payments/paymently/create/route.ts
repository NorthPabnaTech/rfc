import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createPaymentlySessionForOrder } from '@/services/payments';
import { getCurrentUser } from '@lib/auth/current-user';
import { AppError } from '@lib/errors';
import { objectId } from '@lib/validators/common';

const createSchema = z.object({
  orderId: objectId,
  paymentToken: z.string().trim().min(1).max(128).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid payment session request.' },
        { status: 400 },
      );
    }

    const user = await getCurrentUser();
    const origin = req.nextUrl.origin;

    const { paymentUrl } = await createPaymentlySessionForOrder({
      orderId: parsed.data.orderId,
      userId: user?.id ?? null,
      paymentToken: parsed.data.paymentToken,
      origin,
    });

    return NextResponse.json({ ok: true, paymentUrl });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { ok: false, error: 'Failed to create online payment session.' },
      { status: 500 },
    );
  }
}
