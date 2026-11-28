import 'server-only';

import { jwtVerify, SignJWT } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolvePublicStorefrontBusiness } from '@/services/businesses';
import { serverEnv } from '@lib/env';
import { AppError, zodFieldErrors } from '@lib/errors';

const CUSTOMER_JWT_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const jwtKey = new TextEncoder().encode(serverEnv.AUTH_SECRET);

export const STOREFRONT_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.STOREFRONT_ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-storefront-key, x-business-slug',
};

export async function getStorefrontBusiness(req: NextRequest): Promise<string> {
  const slug =
    req.nextUrl.searchParams.get('business') ?? req.headers.get('x-business-slug');
  return resolvePublicStorefrontBusiness(slug);
}

export function storefrontOptionsResponse(): NextResponse {
  return new NextResponse(null, { status: 204, headers: STOREFRONT_CORS_HEADERS });
}

export function storefrontJson<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status, headers: STOREFRONT_CORS_HEADERS });
}

export function storefrontError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: error.status, headers: STOREFRONT_CORS_HEADERS },
    );
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Please fix the highlighted fields.',
        fieldErrors: zodFieldErrors(error),
      },
      { status: 400, headers: STOREFRONT_CORS_HEADERS },
    );
  }
  console.error('[storefront-api error]', error);
  return NextResponse.json(
    { ok: false, error: 'Something went wrong. Please try again.' },
    { status: 500, headers: STOREFRONT_CORS_HEADERS },
  );
}

/**
 * Optional API key guard: if `STOREFRONT_API_KEY` is configured on the server,
 * external storefront clients must send it in `x-storefront-key` (or `Bearer`).
 */
export function verifyStorefrontKey(req: NextRequest): NextResponse | null {
  const expected = process.env.STOREFRONT_API_KEY?.trim();
  if (!expected) return null;

  const headerKey = req.headers.get('x-storefront-key')?.trim();
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (headerKey === expected || bearer === expected) return null;

  return NextResponse.json(
    { ok: false, error: 'Unauthorized storefront request.' },
    { status: 401, headers: STOREFRONT_CORS_HEADERS },
  );
}

export const DEFAULT_STOREFRONT_CALLBACK_URL =
  process.env.STOREFRONT_CALLBACK_URL || 'http://localhost:3001/auth/callback';

function storefrontRedirectOrigins(): Set<string> {
  const origins = new Set<string>();
  for (const o of (process.env.STOREFRONT_ALLOWED_ORIGIN ?? '').split(',')) {
    const trimmed = o.trim();
    if (!trimmed || trimmed === '*') continue;
    try {
      origins.add(new URL(trimmed).origin);
    } catch {
      /* ignore malformed entry */
    }
  }
  if (process.env.STOREFRONT_CALLBACK_URL) {
    try {
      origins.add(new URL(process.env.STOREFRONT_CALLBACK_URL).origin);
    } catch {
      /* ignore */
    }
  }
  return origins;
}

export function isAllowedStorefrontRedirect(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    if (parsed.username || parsed.password) return false;
    if (storefrontRedirectOrigins().has(parsed.origin)) return true;
    return (
      !serverEnv.IS_PROD && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

export async function signStorefrontCustomerToken(userId: string): Promise<string> {
  return new SignJWT({ kind: 'storefront_customer' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${CUSTOMER_JWT_TTL_SECONDS}s`)
    .sign(jwtKey);
}

export async function getStorefrontCustomerId(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwtKey, { algorithms: ['HS256'] });
    if (payload.kind !== 'storefront_customer' || typeof payload.sub !== 'string') return null;
    return payload.sub;
  } catch {
    return null;
  }
}

