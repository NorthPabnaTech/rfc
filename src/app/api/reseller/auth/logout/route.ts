import { NextRequest } from 'next/server';

import { revokeResellerTokens } from '@/services/resellers';
import {
  requireReseller,
  resellerJson,
  resellerOptionsResponse,
} from '@lib/auth/reseller-auth';

export function OPTIONS() {
  return resellerOptionsResponse();
}

/**
 * POST /api/reseller/auth/logout — revokes every token of this account
 * (signs the reseller out on all devices).
 */
export async function POST(req: NextRequest) {
  const auth = await requireReseller(req);
  if (auth.error) return auth.error;
  await revokeResellerTokens(String(auth.reseller._id));
  return resellerJson({ ok: true, data: null });
}
