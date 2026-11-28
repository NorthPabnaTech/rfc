import { NextRequest } from 'next/server';

import { SITE } from '@/config/site';
import { enforceRateLimit, requestIp } from '@/services/rate-limit';
import { requestPasswordReset } from '@/services/users';
import {
  storefrontError,
  storefrontJson,
  storefrontOptionsResponse,
  verifyStorefrontKey,
} from '@lib/storefront-api';
import { forgotPasswordSchema } from '@lib/validators/auth';

export function OPTIONS() {
  return storefrontOptionsResponse();
}

export async function POST(req: NextRequest) {
  const denied = verifyStorefrontKey(req);
  if (denied) return denied;

  try {
    const body: unknown = await req.json();
    const { email } = forgotPasswordSchema.parse(body);
    await enforceRateLimit('forgotPassword', `ip:${await requestIp()}`, `email:${email}`);
    const origin = SITE.url.replace(/\/+$/, '');
    await requestPasswordReset(email, origin);
    return storefrontJson({ sent: true });
  } catch (error) {
    return storefrontError(error);
  }
}
