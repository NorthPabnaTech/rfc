import { NextRequest } from 'next/server';

import { getResellerOrderDetail } from '@/services/resellers';
import {
  requireReseller,
  resellerError,
  resellerJson,
  resellerOptionsResponse,
} from '@lib/auth/reseller-auth';

export function OPTIONS() {
  return resellerOptionsResponse();
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireReseller(req);
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const order = await getResellerOrderDetail(String(auth.reseller._id), id);
    if (!order) return resellerError('Order not found.', 404);
    return resellerJson({ ok: true, data: order });
  } catch {
    return resellerError('Failed to load order details.', 500);
  }
}
