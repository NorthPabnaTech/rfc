import { randomBytes } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import { serverEnv } from '@lib/env';
import { AppError } from '@lib/errors';
import {
  DEFAULT_STOREFRONT_CALLBACK_URL,
  isAllowedStorefrontRedirect,
  storefrontError,
  storefrontOptionsResponse,
} from '@lib/storefront-api';

const STATE_COOKIE = 'rfc_sf_google_state';
const REDIRECT_COOKIE = 'rfc_sf_google_redirect';

export function OPTIONS() {
  return storefrontOptionsResponse();
}

/**
 * External storefront Google OAuth entry:
 *   GET /api/storefront/auth/google?redirect_uri=https://other-site.com/auth/callback
 */
export async function GET(req: NextRequest) {
  const redirectUriParam =
    req.nextUrl.searchParams.get('redirect_uri') || DEFAULT_STOREFRONT_CALLBACK_URL;

  if (!isAllowedStorefrontRedirect(redirectUriParam)) {
    return storefrontError(new AppError('Invalid redirect_uri.', 400));
  }

  if (!serverEnv.GOOGLE_CLIENT_ID || !serverEnv.GOOGLE_CLIENT_SECRET) {
    const errUrl = new URL(redirectUriParam);
    errUrl.searchParams.set('error', 'google_not_configured');
    return NextResponse.redirect(errUrl);
  }

  const state = randomBytes(24).toString('hex');
  const callbackUri = `${req.nextUrl.origin}/api/storefront/auth/google/callback`;
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
