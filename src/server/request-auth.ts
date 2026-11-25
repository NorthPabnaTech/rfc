import 'server-only';

import { PLATFORM } from '@config/platform';
import { AppError } from '@lib/errors';

/*
 * Auth for the Route Handlers the seller panel calls directly (avatar upload,
 * fraud check, Paymently). The panel signs in against the reseller backend
 * (`NEXT_PUBLIC_API_URL`, Bearer token), so a request is accepted when either
 *   1. it carries a valid local `resell_session` cookie with an allowed role, or
 *   2. its Bearer token is confirmed by the backend's `GET /auth/me`.
 * The user id always comes from that verification, never from the request body.
 */

export type RequestUser = { id: string; role: 'seller' | 'admin'; name: string; email: string };

type MeEnvelope = {
  ok?: boolean;
  data?: { id?: string | number; name?: string; email?: string; isActive?: boolean };
};

async function fromCookie(roles: RequestUser['role'][]): Promise<RequestUser | null> {
  try {
    // Imported lazily: session.ts validates AUTH_SECRET at load time.
    const { currentUser } = await import('./session');
    const u = await currentUser();
    if (!u || !roles.includes(u.role)) return null;
    if (u.role === 'seller' && u.status !== 'active') return null;
    return { id: u.id, role: u.role, name: u.name, email: u.email };
  } catch {
    return null; // local auth not configured — fall back to the Bearer token
  }
}

async function fromBearer(req: Request): Promise<RequestUser | null> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const base = PLATFORM.apiUrl.trim().replace(/\/+$/, '');
  if (!token || !base) return null;

  let res: Response;
  try {
    res = await fetch(`${base}/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new AppError('Could not verify your session. Please try again.', 502);
  }
  const json = (await res.json().catch(() => null)) as MeEnvelope | null;
  const me = res.ok && json?.ok ? json.data : undefined;
  if (!me?.id || !me.isActive) return null;
  return { id: String(me.id), role: 'seller', name: me.name ?? '', email: me.email ?? '' };
}

export async function requireRequestUser(
  req: Request,
  roles: RequestUser['role'][] = ['seller'],
): Promise<RequestUser> {
  const user =
    (await fromCookie(roles)) ?? (roles.includes('seller') ? await fromBearer(req) : null);
  if (!user) throw new AppError('Please sign in to continue.', 401);
  return user;
}
