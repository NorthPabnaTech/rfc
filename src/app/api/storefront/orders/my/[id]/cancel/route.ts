import { NextRequest } from 'next/server';
import { z } from 'zod';

import { cancelOrderByCustomer, getCustomerOrder } from '@/services/orders';
import { AppError } from '@lib/errors';
import {
  getStorefrontBusiness,
  getStorefrontCustomerId,
  storefrontError,
  storefrontJson,
  storefrontOptionsResponse,
  verifyStorefrontKey,
} from '@lib/storefront-api';
import { optionalText } from '@lib/validators/common';

const bodySchema = z.object({
  reason: optionalText(300),
});

export function OPTIONS() {
  return storefrontOptionsResponse();
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const denied = verifyStorefrontKey(req);
  if (denied) return denied;

  try {
    const userId = await getStorefrontCustomerId(req);
    if (!userId) throw new AppError('Unauthorized.', 401);

    const business = await getStorefrontBusiness(req);
    const { id } = await context.params;
    const order = await getCustomerOrder(userId, id, business);
    if (!order) throw new AppError('Order not found.', 404);

    const rawBody: unknown = await req.json().catch(() => ({}));
    const { reason } = bodySchema.parse(rawBody);
    await cancelOrderByCustomer(userId, order.id, reason);

    return storefrontJson({ cancelled: true });
  } catch (error) {
    return storefrontError(error);
  }
}
