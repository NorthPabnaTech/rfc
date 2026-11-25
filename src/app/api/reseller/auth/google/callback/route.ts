import { NextRequest, NextResponse } from 'next/server';

import { findOrCreateGoogleReseller } from '@/services/resellers';
import {
  DEFAULT_RESELLER_CALLBACK_URL,
  isAllowedResellerRedirect,
  signResellerToken,
} from '@lib/auth/reseller-auth';
import { serverEnv } from '@lib/env';
import { AppError } from '@lib/errors';

const STATE_COOKIE = 'rfc_reseller_google_state';
const REDIRECT_COOKIE = 'rfc_reseller_google_redirect';

function redirectWithError(target: string, code: string) {
  const url = new URL(target);
  url.searchParams.set('error', code);
  const res = NextResponse.redirect(url);
  res.cookies.delete(STATE_COOKIE);
  res.cookies.delete(REDIRECT_COOKIE);
  return res;
}

export async function GET(req: NextRequest) {
  const cookieRedirect = req.cookies.get(REDIRECT_COOKIE)?.value;
  const targetRedirect =
    cookieRedirect && isAllowedResellerRedirect(cookieRedirect)
      ? cookieRedirect
      : DEFAULT_RESELLER_CALLBACK_URL;

  if (!serverEnv.GOOGLE_CLIENT_ID || !serverEnv.GOOGLE_CLIENT_SECRET) {
    return redirectWithError(targetRedirect, 'google_not_configured');
  }

  if (req.nextUrl.searchParams.get('error')) {
    return redirectWithError(targetRedirect, 'google_cancelled');
  }

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const storedState = req.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return redirectWithError(targetRedirect, 'google_state_invalid');
  }

  try {
    const callbackUri = `${req.nextUrl.origin}/api/reseller/auth/google/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: serverEnv.GOOGLE_CLIENT_ID,
        client_secret: serverEnv.GOOGLE_CLIENT_SECRET,
        redirect_uri: callbackUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenRes.ok || !tokenData.access_token) {
      return redirectWithError(targetRedirect, 'google_token_failed');
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await profileRes.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };
    if (!profileRes.ok || !profile.sub || !profile.email) {
      return redirectWithError(targetRedirect, 'google_profile_failed');
    }
    if (profile.email_verified !== true) {
      return redirectWithError(targetRedirect, 'google_email_unverified');
    }

    const reseller = await findOrCreateGoogleReseller({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture,
    });
    const token = await signResellerToken(reseller);

    const successUrl = new URL(targetRedirect);
    successUrl.searchParams.set('token', token);
    const res = NextResponse.redirect(successUrl);
    res.cookies.delete(STATE_COOKIE);
    res.cookies.delete(REDIRECT_COOKIE);
    return res;
  } catch (err) {
    if (err instanceof AppError && err.status === 403) {
      return redirectWithError(targetRedirect, 'account_disabled');
    }
    return redirectWithError(targetRedirect, 'google_auth_error');
  }
}
