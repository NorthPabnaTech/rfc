import 'server-only';

import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

import { serverEnv } from '@lib/env';
import { AppError } from '@lib/errors';

import type { Role } from '@/types/platform';

import { connectDB } from './db';
import { UserModel } from './models';

/*
 * Reseller session: an HS256 JWT in an httpOnly cookie (separate from the
 * legacy RFC Gadget cookie). Every request re-loads the user, so suspending
 * or deactivating an account takes effect immediately.
 */

export const RESELL_SESSION_COOKIE = 'resell_session';
const TTL_SECONDS = 60 * 60 * 24 * 30;
const key = new TextEncoder().encode(serverEnv.AUTH_SECRET);

export async function createSession(user: { id: string; role: Role }): Promise<void> {
  const token = await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(key);
  (await cookies()).set(RESELL_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: serverEnv.IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_SECONDS,
  });
}

export async function deleteSession(): Promise<void> {
  (await cookies()).delete(RESELL_SESSION_COOKIE);
}

async function readToken(): Promise<{ sub: string; role: Role } | null> {
  const token = (await cookies()).get(RESELL_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    const role = payload.role;
    if (typeof payload.sub !== 'string' || (role !== 'admin' && role !== 'seller')) return null;
    return { sub: payload.sub, role };
  } catch {
    return null;
  }
}

export type SessionUser = {
  id: string;
  role: Role;
  name: string;
  email: string;
  status: string;
};

/** The signed-in user, or null (also null when the account is no longer usable). */
export async function currentUser(): Promise<SessionUser | null> {
  const token = await readToken();
  if (!token) return null;
  await connectDB();
  const user = await UserModel.findById(token.sub).lean();
  if (!user || user.role !== token.role) return null;
  if (user.status === 'suspended' || user.status === 'inactive') return null;
  return { id: String(user._id), role: user.role, name: user.name, email: user.email, status: user.status };
}

export async function requireUser(role?: Role): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new AppError('Please sign in to continue.', 401);
  if (role && user.role !== role) throw new AppError('You do not have access to this.', 403);
  if (user.role === 'seller' && user.status !== 'active' && role === 'seller') {
    throw new AppError('Your seller account is awaiting approval.', 403);
  }
  return user;
}

export const requireAdmin = () => requireUser('admin');
export const requireSeller = () => requireUser('seller');
