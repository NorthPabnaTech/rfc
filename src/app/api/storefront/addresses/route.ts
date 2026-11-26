import { NextRequest } from 'next/server';

import { listAddresses, saveAddress } from '@/services/users';
import { AppError } from '@lib/errors';
import {
  getStorefrontCustomerId,
  storefrontError,
  storefrontJson,
  storefrontOptionsResponse,
  verifyStorefrontKey,
} from '@lib/storefront-api';
import { addressSchema } from '@lib/validators/auth';

export function OPTIONS() {
  return storefrontOptionsResponse();
}

export async function GET(req: NextRequest) {
  const denied = verifyStorefrontKey(req);
  if (denied) return denied;

  try {
    const userId = await getStorefrontCustomerId(req);
    if (!userId) throw new AppError('Unauthorized.', 401);

    const addresses = await listAddresses(userId);
    return storefrontJson(addresses);
  } catch (error) {
    return storefrontError(error);
  }
}

export async function POST(req: NextRequest) {
  const denied = verifyStorefrontKey(req);
  if (denied) return denied;

  try {
    const userId = await getStorefrontCustomerId(req);
    if (!userId) throw new AppError('Unauthorized.', 401);

    const body: unknown = await req.json();
    const input = addressSchema.parse(body);
    const created = await saveAddress(userId, input);
    return storefrontJson(created, 201);
  } catch (error) {
    return storefrontError(error);
  }
}
