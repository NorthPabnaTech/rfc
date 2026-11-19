import { NextResponse } from 'next/server';

import { checkCourierFraud } from '@/services/fraud-checker';
import { requireAdmin } from '@lib/auth/current-user';
import { AppError } from '@lib/errors';

export async function POST(req: Request) {
  try {
    await requireAdmin();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Invalid JSON request body.' },
        { status: 400 },
      );
    }

    const rawPhone =
      body && typeof body === 'object' && 'phone' in body && typeof body.phone === 'string'
        ? body.phone
        : '';

    const report = await checkCourierFraud(rawPhone);
    return NextResponse.json({ ok: true, data: report }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { ok: false, error: 'Unexpected error while checking courier history.' },
      { status: 500 },
    );
  }
}
