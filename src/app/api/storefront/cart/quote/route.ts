import { NextRequest } from 'next/server';
import { z } from 'zod';

import { quoteCart } from '@/services/orders';
import { SHIPPING_ZONES } from '@lib/constants';
import {
  storefrontError,
  storefrontJson,
  storefrontOptionsResponse,
  verifyStorefrontKey,
} from '@lib/storefront-api';
import { cartLineSchema } from '@lib/validators/order';

const quoteSchema = z.object({
  items: z.array(cartLineSchema).max(50),
  zone: z.enum(SHIPPING_ZONES).optional(),
  couponCode: z.string().trim().max(32).optional(),
});

export function OPTIONS() {
  return storefrontOptionsResponse();
}

export async function POST(req: NextRequest) {
  const denied = verifyStorefrontKey(req);
  if (denied) return denied;

  try {
    const body: unknown = await req.json();
    const { items, zone, couponCode } = quoteSchema.parse(body);
    const quote = await quoteCart(items, zone, couponCode);
    return storefrontJson(quote);
  } catch (error) {
    return storefrontError(error);
  }
}
