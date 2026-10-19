import 'server-only';

import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

import type { UserRole } from '@lib/constants';
import { serverEnv } from '@lib/env';

import { SESSION_COOKIE, sessionKey, type SessionPayload, verifySessionToken } from './token';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const key = sessionKey(serverEnv.AUTH_SECRET);

export async function createSession(user: { id: string; role: UserRole }): Promise<void> {
  const token = await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key);

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: serverEnv.IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function deleteSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Decodes the session cookie. Does NOT check the user still exists — see current-user.ts. */
export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value, key);
}
