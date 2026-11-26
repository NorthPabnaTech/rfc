import { NextRequest } from 'next/server';

import { trackOrder } from '@/services/orders';
import { enforceRateLimit, requestIp } from '@/services/rate-limit';
import { AppError } from '@lib/errors';
import {
  storefrontError,
  storefrontJson,
  storefrontOptionsResponse,
  verifyStorefrontKey,
} from '@lib/storefront-api';
import { trackOrderSchema } from '@lib/validators/order';

export function OPTIONS() {
  return storefrontOptionsResponse();
}

async function handleTrack(input: unknown) {
  const { orderNumber, phone } = trackOrderSchema.parse(input);
  await enforceRateLimit('trackOrder', `ip:${await requestIp()}`, `order:${orderNumber}`);
  const order = await trackOrder(orderNumber, phone);
  if (!order) throw new AppError('No order found with that number and phone.', 404);
  return order;
}

export async function GET(req: NextRequest) {
  const denied = verifyStorefrontKey(req);
  if (denied) return denied;

  try {
    const order = await handleTrack({
      orderNumber: req.nextUrl.searchParams.get('orderNumber') ?? '',
      phone: req.nextUrl.searchParams.get('phone') ?? '',
    });
    return storefrontJson(order);
  } catch (error) {
    return storefrontError(error);
  }
}

export async function POST(req: NextRequest) {
  const denied = verifyStorefrontKey(req);
  if (denied) return denied;

  try {
    const body: unknown = await req.json();
    const order = await handleTrack(body);
    return storefrontJson(order);
  } catch (error) {
    return storefrontError(error);
  }
}
