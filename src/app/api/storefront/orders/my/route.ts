import { NextRequest } from 'next/server';

import { listCustomerOrders } from '@/services/orders';
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

export async function GET(req: NextRequest) {
  const denied = verifyStorefrontKey(req);
  if (denied) return denied;

  try {
    const userId = await getStorefrontCustomerId(req);
    if (!userId) throw new AppError('Unauthorized.', 401);

    const business = await getStorefrontBusiness(req);
    const orders = await listCustomerOrders(userId, business);
    return storefrontJson(orders);
  } catch (error) {
    return storefrontError(error);
  }
}
