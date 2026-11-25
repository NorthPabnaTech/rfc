import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { syncDueSuppliers } from '@/services/supplier-sync';
import { getCurrentUser } from '@lib/auth/current-user';

function hasCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const header = req.headers.get('authorization');
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function runSync() {
  const result = await syncDueSuppliers();
  return NextResponse.json({ ok: true, ...result });
}

/** Scheduler entry point: `Authorization: Bearer $CRON_SECRET` only. */
export async function GET(req: Request) {
  if (!hasCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runSync();
}

/**
 * Cron secret, or a signed-in admin. Cookie auth is only accepted on POST:
 * the session cookie is SameSite=Lax, so a cross-site page can't trigger it.
 */
export async function POST(req: Request) {
  if (!hasCronSecret(req)) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  return runSync();
}
