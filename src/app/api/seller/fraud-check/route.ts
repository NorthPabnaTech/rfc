import { NextRequest, NextResponse } from 'next/server';

import { requireRequestUser } from '@/server/request-auth';
import { checkCourierFraud } from '@/services/fraud-checker';
import { AppError } from '@lib/errors';

export async function POST(req: NextRequest) {
  try {
    // Signed-in sellers/admins only: the report exposes a person's courier history.
    await requireRequestUser(req, ['seller', 'admin']);

    const body = (await req.json().catch(() => null)) as { phone?: string } | null;
    const phone = body?.phone?.trim();
    if (!phone) {
      return NextResponse.json(
        { ok: false, error: 'Phone number is required.' },
        { status: 400 },
      );
    }

    const report = await checkCourierFraud(phone);
    return NextResponse.json({ ok: true, data: report });
  } catch (err) {
    const message =
      err instanceof AppError ? err.message : 'Failed to check courier history.';
    const status = err instanceof AppError ? err.status : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
