import { NextRequest } from 'next/server';

import { getCustomerOrder } from '@/services/orders';
import { AppError } from '@lib/errors';
import {
  getStorefrontBusiness,
  getStorefrontCustomerId,
  storefrontError,
  storefrontJson,
  storefrontOptionsResponse,
  verifyStorefrontKey,
} from '@lib/storefront-api';

export function OPTIONS() {
  return storefrontOptionsResponse();
}

export async function GET(
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

    return storefrontJson(order);
  } catch (error) {
    return storefrontError(error);
  }
}
