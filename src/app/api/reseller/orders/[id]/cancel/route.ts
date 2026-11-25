import { NextRequest } from 'next/server';

import { cancelResellerOrder } from '@/services/resellers';
import {
  requireReseller,
  resellerError,
  resellerJson,
  resellerOptionsResponse,
} from '@lib/auth/reseller-auth';
import { AppError } from '@lib/errors';

export function OPTIONS() {
  return resellerOptionsResponse();
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireReseller(req);
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const body = (await req.json().catch(() => ({}))) as { reason?: string };
    const order = await cancelResellerOrder(String(auth.reseller._id), id, body?.reason);
    return resellerJson({ ok: true, data: order });
  } catch (err) {
    if (err instanceof AppError) return resellerError(err.message, err.status);
    return resellerError('Failed to cancel order.', 500);
  }
}
