import { jwtVerify } from 'jose';

import { USER_ROLES, type UserRole } from '@lib/constants';

/**
 * Edge-safe session token helpers, shared by the Node server code and by
 * `proxy.ts` (which must not import server-only modules like env/mongoose).
 */
export const SESSION_COOKIE = 'rfc_gadget_session';

/** `iat` = issued-at, in seconds. */
export type SessionPayload = { sub: string; role: UserRole; iat: number };

export function sessionKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function verifySessionToken(
  token: string | undefined,
  key: Uint8Array,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    const role = payload.role as UserRole;
    if (typeof payload.sub !== 'string' || !USER_ROLES.includes(role)) return null;
    return { sub: payload.sub, role, iat: payload.iat ?? 0 };
  } catch {
    return null;
  }
}
