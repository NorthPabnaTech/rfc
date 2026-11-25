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

export function resellerOptionsResponse(): NextResponse {
  return new NextResponse(null, { status: 204, headers: RESELLER_CORS_HEADERS });
}

export function resellerJson<T>(body: T, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: RESELLER_CORS_HEADERS });
}

export function resellerError(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status, headers: RESELLER_CORS_HEADERS });
}

export async function signResellerToken(resellerId: string): Promise<string> {
  return new SignJWT({ kind: 'reseller' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(resellerId)
    .setIssuedAt()
    .setExpirationTime(`${RESELLER_JWT_TTL_SECONDS}s`)
    .sign(key);
}

export async function verifyResellerToken(
  token: string | undefined,
): Promise<{ sub: string; iat: number } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    if (payload.kind !== 'reseller' || typeof payload.sub !== 'string') return null;
    return { sub: payload.sub, iat: payload.iat ?? 0 };
  } catch {
    return null;
  }
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

  if (reseller.passwordChangedAt) {
    const changedSec = Math.floor(reseller.passwordChangedAt.getTime() / 1000);
    if (payload.iat < changedSec) return null;
  }
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
  if (reseller.passwordChangedAt) {
    const changedSec = Math.floor(reseller.passwordChangedAt.getTime() / 1000);
    if (payload.iat < changedSec) {
      return { error: resellerError('Session expired. Please sign in again.', 401) };
    }
  }
  return { reseller };
}
