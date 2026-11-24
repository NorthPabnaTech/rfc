import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Callout } from '@components/shared/callout';
import { getCurrentUser } from '@lib/auth/current-user';
import { serverEnv } from '@lib/env';
import { param, type SearchParams } from '@lib/search-params';

import { GoogleAuthButton } from '../components/google-auth-button';
import { LoginForm } from './components/login-form';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_cancelled: 'Google sign-in was cancelled.',
  google_state_invalid: 'Google sign-in session expired. Please try again.',
  google_token_failed: 'Could not verify your Google account. Please try again.',
  google_profile_failed: 'Could not read your Google profile. Please try again.',
  account_disabled: 'Your account has been disabled. Please contact support.',
  google_auth_error: 'Google sign-in failed. Please try again.',
  google_not_configured: 'Google sign-in is not configured yet.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const next = param(sp, 'next');
  const errorCode = param(sp, 'error');
  const errorMessage = errorCode ? GOOGLE_ERROR_MESSAGES[errorCode] : undefined;
  const googleEnabled = Boolean(serverEnv.GOOGLE_CLIENT_ID && serverEnv.GOOGLE_CLIENT_SECRET);
  const user = await getCurrentUser();
  if (user)
    redirect(
      next?.startsWith('/') && !next.startsWith('//')
        ? next
        : user.role === 'admin'
          ? '/admin'
          : '/account',
    );

  return (
    <>
      <h1 className="type-display text-ink">Welcome back</h1>
      <p className="text-muted mt-2 text-sm">Sign in to your RFC Gadget account.</p>
      {errorMessage && (
        <Callout tone="danger" className="mt-4">
          {errorMessage}
        </Callout>
      )}
      <LoginForm next={next} />
      {googleEnabled && <GoogleAuthButton next={next} />}
    </>
  );
}
