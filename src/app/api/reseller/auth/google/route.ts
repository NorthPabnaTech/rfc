import { randomBytes } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { clientIpFrom, enforceRateLimit } from '@/services/rate-limit';
import { findOrCreateGoogleReseller } from '@/services/resellers';
import {
  DEFAULT_RESELLER_CALLBACK_URL,
  isAllowedResellerRedirect,
  resellerError,
  resellerJson,
  resellerOptionsResponse,
  signResellerToken,
} from '@lib/auth/reseller-auth';
import { serverEnv } from '@lib/env';
import { AppError } from '@lib/errors';

const STATE_COOKIE = 'rfc_reseller_google_state';
const REDIRECT_COOKIE = 'rfc_reseller_google_redirect';

export function OPTIONS() {
  return resellerOptionsResponse();
}

/**
 * Browser redirect flow:
 * Reseller site sends user to:
 *   GET /api/reseller/auth/google?redirect_uri=https://reseller-site.com/auth/callback
 */
export async function GET(req: NextRequest) {
  const redirectUriParam =
    req.nextUrl.searchParams.get('redirect_uri') || DEFAULT_RESELLER_CALLBACK_URL;

  if (!isAllowedResellerRedirect(redirectUriParam)) {
    return resellerError('Invalid redirect_uri.', 400);
  }
  try {
    await enforceRateLimit('resellerAuth', `ip:${clientIpFrom(req.headers)}`);
  } catch (err) {
    if (err instanceof AppError) return resellerError(err.message, err.status);
    throw err;
  }

  if (!serverEnv.GOOGLE_CLIENT_ID || !serverEnv.GOOGLE_CLIENT_SECRET) {
    const errUrl = new URL(redirectUriParam);
    errUrl.searchParams.set('error', 'google_not_configured');
    return NextResponse.redirect(errUrl);
  }

  const state = randomBytes(24).toString('hex');
  const callbackUri = `${req.nextUrl.origin}/api/reseller/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: serverEnv.GOOGLE_CLIENT_ID,
    redirect_uri: callbackUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });

  const res = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
  const cookieOpts = {
    httpOnly: true,
    secure: serverEnv.IS_PROD,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 10,
  };
  res.cookies.set(STATE_COOKIE, state, cookieOpts);
  res.cookies.set(REDIRECT_COOKIE, redirectUriParam, cookieOpts);
  return res;
}

const idTokenSchema = z.object({
  idToken: z.string().trim().min(10),
});

/**
 * Direct token exchange flow (for Google One Tap / @react-oauth/google):
 *   POST /api/reseller/auth/google  { "idToken": "<google_id_token>" }
 */
export async function POST(req: NextRequest) {
  if (!serverEnv.GOOGLE_CLIENT_ID) {
    return resellerError('Google sign-in is not configured.', 503);
  }

  try {
    await enforceRateLimit('resellerAuth', `ip:${clientIpFrom(req.headers)}`);
    const body = await req.json();
    const parsed = idTokenSchema.safeParse(body);
    if (!parsed.success) {
      return resellerError('Valid Google idToken is required.', 400);
    }

    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(parsed.data.idToken)}`,
    );
    const info = (await verifyRes.json()) as {
      aud?: string;
      sub?: string;
      email?: string;
      email_verified?: string;
      name?: string;
      picture?: string;
    };

    if (
      !verifyRes.ok ||
      info.aud !== serverEnv.GOOGLE_CLIENT_ID ||
      !info.sub ||
      !info.email ||
      String(info.email_verified) !== 'true'
    ) {
      return resellerError('Invalid Google token.', 401);
    }

    const reseller = await findOrCreateGoogleReseller({
      googleId: info.sub,
      email: info.email,
      name: info.name,
      avatarUrl: info.picture,
    });
    const token = await signResellerToken(reseller);

    return resellerJson({
      ok: true,
      data: {
        token,
        reseller: {
          id: String(reseller._id),
          name: reseller.name,
          shopName: reseller.shopName,
          email: reseller.email,
          phone: reseller.phone ?? null,
          avatarUrl: reseller.avatarUrl ?? null,
          address: reseller.address ?? null,
          isActive: reseller.isActive,
          walletBalance: reseller.walletBalance,
          payoutDetails: reseller.payoutDetails ?? {},
        },
      },
    });
  } catch (err) {
    if (err instanceof AppError) return resellerError(err.message, err.status);
    return resellerError('Google authentication failed.', 500);
  }
}
