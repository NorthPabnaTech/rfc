import { NextRequest } from 'next/server';

import { getResellerDashboardStats } from '@/services/resellers';
import {
  requireReseller,
  resellerError,
  resellerJson,
  resellerOptionsResponse,
} from '@lib/auth/reseller-auth';

export function OPTIONS() {
  return resellerOptionsResponse();
}

export async function GET(req: NextRequest) {
  const auth = await requireReseller(req);
  if (auth.error) return auth.error;

  try {
    const daysParam = req.nextUrl.searchParams.get('days');
    const days = daysParam ? Number(daysParam) : 30;
    const data = await getResellerDashboardStats(String(auth.reseller._id), days);
    return resellerJson({ ok: true, data });
  } catch {
    return resellerError('Failed to load dashboard stats.', 500);
  }
}
