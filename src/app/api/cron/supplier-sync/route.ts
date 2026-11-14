import { NextResponse } from 'next/server';

import { syncDueSuppliers } from '@/services/supplier-sync';
import { getCurrentUser } from '@lib/auth/current-user';

async function handleSync(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const authHeader = req.headers.get('authorization');
  const cronOk = Boolean(secret && authHeader === `Bearer ${secret}`);

  if (!cronOk) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const result = await syncDueSuppliers();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: Request) {
  return handleSync(req);
}

export async function POST(req: Request) {
  return handleSync(req);
}
