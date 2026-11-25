import 'server-only';

import { jwtVerify, SignJWT } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

import { connectDB, type ResellerDocument, ResellerModel } from '@/database';
import { serverEnv } from '@lib/env';

const RESELLER_JWT_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const key = new TextEncoder().encode(serverEnv.AUTH_SECRET);

export const RESELLER_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.RESELLER_ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/** Default reseller-site callback when the request doesn't name one. */
export const DEFAULT_RESELLER_CALLBACK_URL =
  process.env.RESELLER_SITE_CALLBACK_URL || 'http://localhost:3001/auth/callback';

/**
 * Origins a reseller OAuth flow may send the signed token back to. Built from
 * `RESELLER_ALLOWED_ORIGIN` (comma list; `*` is ignored here) plus the origin
 * of `RESELLER_SITE_CALLBACK_URL`. Outside production localhost is allowed too.
 * Never "anything": an open redirect here hands a reseller's token to an attacker.
 */
function resellerRedirectOrigins(): Set<string> {
  const origins = new Set<string>();
  for (const o of (process.env.RESELLER_ALLOWED_ORIGIN ?? '').split(',')) {
    const trimmed = o.trim();
    if (!trimmed || trimmed === '*') continue;
    try {
      origins.add(new URL(trimmed).origin);
    } catch {
      /* ignore malformed entry */
    }
  }
  if (process.env.RESELLER_SITE_CALLBACK_URL) {
    try {
      origins.add(new URL(process.env.RESELLER_SITE_CALLBACK_URL).origin);
    } catch {
      /* ignore */
    }
  }
  return origins;
}

export function isAllowedResellerRedirect(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    if (parsed.username || parsed.password) return false;
    if (resellerRedirectOrigins().has(parsed.origin)) return true;
    return (
      !serverEnv.IS_PROD && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

export function resellerOptionsResponse(): NextResponse {
  return new NextResponse(null, { status: 204, headers: RESELLER_CORS_HEADERS });
}

export function resellerJson<T>(body: T, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: RESELLER_CORS_HEADERS });
}

export function resellerError(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status, headers: RESELLER_CORS_HEADERS });
}

/**
 * Signs a reseller token carrying the account's current `tokenVersion` (`ver`).
 * Bumping `tokenVersion` (logout, suspension) revokes every token issued before.
 */
export async function signResellerToken(reseller: {
  _id: unknown;
  tokenVersion?: number;
}): Promise<string> {
  return new SignJWT({ kind: 'reseller', ver: reseller.tokenVersion ?? 0 })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(reseller._id))
    .setIssuedAt()
    .setExpirationTime(`${RESELLER_JWT_TTL_SECONDS}s`)
    .sign(key);
}

export async function verifyResellerToken(
  token: string | undefined,
): Promise<{ sub: string; iat: number; ver: number } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    if (payload.kind !== 'reseller' || typeof payload.sub !== 'string') return null;
    // Tokens issued before versioning carry no `ver`; they count as version 0.
    const ver = typeof payload.ver === 'number' ? payload.ver : 0;
    return { sub: payload.sub, iat: payload.iat ?? 0, ver };
  } catch {
    return null;
  }
}

/** True when the token was revoked (logout / suspension / password change). */
function isTokenRevoked(
  reseller: ResellerDocument,
  payload: { iat: number; ver: number },
): boolean {
  if (payload.ver !== (reseller.tokenVersion ?? 0)) return true;
  if (reseller.passwordChangedAt) {
    const changedSec = Math.floor(reseller.passwordChangedAt.getTime() / 1000);
    if (payload.iat < changedSec) return true;
  }
  return false;
}

function extractBearer(req: NextRequest): string | undefined {
  const auth = req.headers.get('authorization');
  if (!auth) return undefined;
  const [scheme, token] = auth.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return undefined;
  return token.trim();
}

/**
 * Returns the authenticated & active Reseller document if a valid Bearer token
 * is present, or `null` otherwise (does not throw).
 */
export async function getOptionalReseller(req: NextRequest): Promise<ResellerDocument | null> {
  const token = extractBearer(req);
  const payload = await verifyResellerToken(token);
  if (!payload) return null;

  await connectDB();
  const reseller = await ResellerModel.findById(payload.sub);
  if (!reseller || !reseller.isActive) return null;
  if (isTokenRevoked(reseller, payload)) return null;
  return reseller;
}

/**
 * Requires an authenticated & active Reseller. Returns `{ reseller }` or `{ error: NextResponse }`.
 */
export async function requireReseller(
  req: NextRequest,
): Promise<{ reseller: ResellerDocument; error?: never } | { reseller?: never; error: NextResponse }> {
  const token = extractBearer(req);
  if (!token) {
    return { error: resellerError('Authentication required.', 401) };
  }
  const payload = await verifyResellerToken(token);
  if (!payload) {
    return { error: resellerError('Invalid or expired token.', 401) };
  }

  await connectDB();
  const reseller = await ResellerModel.findById(payload.sub);
  if (!reseller) {
    return { error: resellerError('Reseller account not found.', 401) };
  }
  if (!reseller.isActive) {
    return { error: resellerError('Your reseller account is currently inactive.', 403) };
  }
  if (isTokenRevoked(reseller, payload)) {
    return { error: resellerError('Session expired. Please sign in again.', 401) };
  }
  return { reseller };
}
