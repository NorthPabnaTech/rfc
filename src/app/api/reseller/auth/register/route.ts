import { resellerError, resellerOptionsResponse } from '@lib/auth/reseller-auth';

export function OPTIONS() {
  return resellerOptionsResponse();
}

export async function POST() {
  return resellerError('Resellers can only sign in with Google.', 403);
}
