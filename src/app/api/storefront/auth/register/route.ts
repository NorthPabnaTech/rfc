import { NextRequest } from 'next/server';

import { SITE } from '@/config/site';
import { enforceRateLimit, requestIp } from '@/services/rate-limit';
import { registerCustomer } from '@/services/users';
import {
  storefrontError,
  storefrontJson,
  storefrontOptionsResponse,
  verifyStorefrontKey,
} from '@lib/storefront-api';
import { registerSchema } from '@lib/validators/auth';

export function OPTIONS() {
  return storefrontOptionsResponse();
}

export async function POST(req: NextRequest) {
  const denied = verifyStorefrontKey(req);
  if (denied) return denied;

  try {
    const body: unknown = await req.json();
    const data = registerSchema.parse(body);
    await enforceRateLimit('register', `ip:${await requestIp()}`, `email:${data.email}`);
    const origin = SITE.url.replace(/\/+$/, '');
    const user = await registerCustomer(data, origin);
    return storefrontJson({ email: user.email }, 201);
  } catch (error) {
    return storefrontError(error);
  }
}
