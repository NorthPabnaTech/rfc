import { randomBytes } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import { serverEnv } from '@lib/env';
import { safeRedirectPath } from '@lib/safe-redirect';

const STATE_COOKIE = 'rfc_google_state';
const NEXT_COOKIE = 'rfc_google_next';

export async function GET(req: NextRequest) {
  if (!serverEnv.GOOGLE_CLIENT_ID || !serverEnv.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(new URL('/login?error=google_not_configured', req.url));
  }

  const state = randomBytes(24).toString('hex');
  const safeNext = safeRedirectPath(req.nextUrl.searchParams.get('next')) ?? '';

  const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: serverEnv.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
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
    maxAge: 60 * 10, // 10 minutes
  };
  res.cookies.set(STATE_COOKIE, state, cookieOpts);
  if (safeNext) {
    res.cookies.set(NEXT_COOKIE, safeNext, cookieOpts);
  } else {
    res.cookies.delete(NEXT_COOKIE);
  }
  return res;
}
