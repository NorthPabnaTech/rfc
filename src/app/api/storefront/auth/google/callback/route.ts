import { NextRequest, NextResponse } from 'next/server';

import { connectDB, UserModel } from '@/database';
import { serverEnv } from '@lib/env';
import {
  DEFAULT_STOREFRONT_CALLBACK_URL,
  isAllowedStorefrontRedirect,
  signStorefrontCustomerToken,
} from '@lib/storefront-api';

const STATE_COOKIE = 'rfc_sf_google_state';
const REDIRECT_COOKIE = 'rfc_sf_google_redirect';

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

function failRedirect(targetUri: string, code: string) {
  const safeTarget = isAllowedStorefrontRedirect(targetUri)
    ? targetUri
    : DEFAULT_STOREFRONT_CALLBACK_URL;
  const url = new URL(safeTarget);
  url.searchParams.set('error', code);
  const res = NextResponse.redirect(url);
  res.cookies.delete(STATE_COOKIE);
  res.cookies.delete(REDIRECT_COOKIE);
  return res;
}

export async function GET(req: NextRequest) {
  const storedRedirect =
    req.cookies.get(REDIRECT_COOKIE)?.value || DEFAULT_STOREFRONT_CALLBACK_URL;

  if (!serverEnv.GOOGLE_CLIENT_ID || !serverEnv.GOOGLE_CLIENT_SECRET) {
    return failRedirect(storedRedirect, 'google_not_configured');
  }

  if (req.nextUrl.searchParams.get('error')) {
    return failRedirect(storedRedirect, 'google_cancelled');
  }

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const storedState = req.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return failRedirect(storedRedirect, 'google_state_invalid');
  }

  if (!isAllowedStorefrontRedirect(storedRedirect)) {
    return failRedirect(DEFAULT_STOREFRONT_CALLBACK_URL, 'invalid_redirect');
  }

  const callbackUri = `${req.nextUrl.origin}/api/storefront/auth/google/callback`;

  try {
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
    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
    if (!tokenRes.ok || !tokenData.access_token) {
      return failRedirect(storedRedirect, 'google_token_failed');
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await profileRes.json()) as GoogleUserInfo;
    if (!profileRes.ok || !profile.sub || !profile.email) {
      return failRedirect(storedRedirect, 'google_profile_failed');
    }
    if (profile.email_verified !== true) {
      return failRedirect(storedRedirect, 'google_email_unverified');
    }

    const email = profile.email.trim().toLowerCase();
    await connectDB();

    let user =
      (await UserModel.findOne({ googleId: profile.sub })) ??
      (await UserModel.findOne({ email }));

    if (user) {
      if (!user.isActive) {
        return failRedirect(storedRedirect, 'account_disabled');
      }
      if (user.googleId && user.googleId !== profile.sub) {
        return failRedirect(storedRedirect, 'google_account_mismatch');
      }
      if (!user.googleId && user.role === 'admin') {
        return failRedirect(storedRedirect, 'google_admin_not_linked');
      }
      if (!user.googleId) user.googleId = profile.sub;
      user.isEmailVerified = true;
      user.lastLoginAt = new Date();
      if (!user.avatar?.url && profile.picture) {
        user.avatar = { type: 'external', url: profile.picture };
      }
      await user.save();
    } else {
      user = await UserModel.create({
        name: profile.name?.trim() || email.split('@')[0] || 'Customer',
        email,
        googleId: profile.sub,
        role: 'customer',
        isActive: true,
        isEmailVerified: true,
        lastLoginAt: new Date(),
        ...(profile.picture ? { avatar: { type: 'external', url: profile.picture } } : {}),
      });
    }

    const token = await signStorefrontCustomerToken(String(user._id));
    const okUrl = new URL(storedRedirect);
    okUrl.searchParams.set('token', token);
    const res = NextResponse.redirect(okUrl);
    res.cookies.delete(STATE_COOKIE);
    res.cookies.delete(REDIRECT_COOKIE);
    return res;
  } catch (err) {
    console.error('[storefront google oauth]', err);
    return failRedirect(storedRedirect, 'google_failed');
  }
}
