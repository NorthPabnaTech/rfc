import { NextRequest } from 'next/server';

import { connectDB, UserModel } from '@/database';
import { enforceRateLimit, requestIp } from '@/services/rate-limit';
import { authenticate } from '@/services/users';
import {
  signStorefrontCustomerToken,
  storefrontError,
  storefrontJson,
  storefrontOptionsResponse,
  verifyStorefrontKey,
} from '@lib/storefront-api';
import { loginSchema } from '@lib/validators/auth';

export function OPTIONS() {
  return storefrontOptionsResponse();
}

export async function POST(req: NextRequest) {
  const denied = verifyStorefrontKey(req);
  if (denied) return denied;

  try {
    const body: unknown = await req.json();
    const { identifier, password } = loginSchema.parse(body);
    await enforceRateLimit(
      'login',
      `ip:${await requestIp()}`,
      `id:${identifier.email ?? identifier.phone}`,
    );
    const authUser = await authenticate(identifier, password);
    const token = await signStorefrontCustomerToken(authUser.id);
    await connectDB();
    const profile = await UserModel.findById(authUser.id)
      .select('name email phone avatar')
      .lean();
    return storefrontJson({
      token,
      user: {
        id: authUser.id,
        name: profile?.name ?? '',
        email: profile?.email ?? null,
        phone: profile?.phone ?? null,
        avatarUrl: profile?.avatar?.url ?? null,
      },
    });
  } catch (error) {
    return storefrontError(error);
  }
}
