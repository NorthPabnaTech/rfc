import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { verifyAndCompletePaymentlyOrder } from '@/services/payments';
import { AppError } from '@lib/errors';

const verifySchema = z.object({
  invoiceId: z.string().trim().min(1).max(128),
  orderNumber: z.string().trim().min(1).max(40).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid verification request.' },
        { status: 400 },
      );
    }

    const result = await verifyAndCompletePaymentlyOrder({
      invoiceId: parsed.data.invoiceId,
      expectedOrderNumber: parsed.data.orderNumber,
    });

    if (result.verified) {
      revalidatePath('/admin', 'layout');
      revalidatePath('/account/orders');
      if (result.orderNumber) {
        revalidatePath(`/order-success/${result.orderNumber}`);
      }
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { ok: false, error: 'Unable to verify payment.' },
      { status: 500 },
    );
  }
}
