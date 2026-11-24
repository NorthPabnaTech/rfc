import { NextRequest, NextResponse } from 'next/server';

import { connectDB, UserModel } from '@/database';
import { createSession } from '@lib/auth/session';
import { serverEnv } from '@lib/env';

const STATE_COOKIE = 'rfc_google_state';
const NEXT_COOKIE = 'rfc_google_next';

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

function failRedirect(req: NextRequest, code: string) {
  const res = NextResponse.redirect(new URL(`/login?error=${code}`, req.url));
  res.cookies.delete(STATE_COOKIE);
  res.cookies.delete(NEXT_COOKIE);
  return res;
}

export async function GET(req: NextRequest) {
  if (!serverEnv.GOOGLE_CLIENT_ID || !serverEnv.GOOGLE_CLIENT_SECRET) {
    return failRedirect(req, 'google_not_configured');
  }

  const errorParam = req.nextUrl.searchParams.get('error');
  if (errorParam) {
    return failRedirect(req, 'google_cancelled');
  }

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const storedState = req.cookies.get(STATE_COOKIE)?.value;
  const storedNext = req.cookies.get(NEXT_COOKIE)?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return failRedirect(req, 'google_state_invalid');
  }

  const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: serverEnv.GOOGLE_CLIENT_ID,
        client_secret: serverEnv.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
    if (!tokenRes.ok || !tokenData.access_token) {
      return failRedirect(req, 'google_token_failed');
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await profileRes.json()) as GoogleUserInfo;
    if (!profileRes.ok || !profile.sub || !profile.email) {
      return failRedirect(req, 'google_profile_failed');
    }

    const email = profile.email.trim().toLowerCase();
    await connectDB();

    let user = await UserModel.findOne({
      $or: [{ googleId: profile.sub }, { email }],
    });

    if (user) {
      if (!user.isActive) {
        return failRedirect(req, 'account_disabled');
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

    await createSession({ id: String(user._id), role: user.role });

    const safeNext =
      storedNext && storedNext.startsWith('/') && !storedNext.startsWith('//')
        ? storedNext
        : user.role === 'admin'
          ? '/admin'
          : '/account';

    const res = NextResponse.redirect(new URL(safeNext, req.url));
    res.cookies.delete(STATE_COOKIE);
    res.cookies.delete(NEXT_COOKIE);
    return res;
  } catch (err) {
    console.error('[google-oauth-callback]', err);
    return failRedirect(req, 'google_auth_error');
  }
}
