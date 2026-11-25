'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';

import { useI18n } from '@/i18n/provider';
import { useResellerAuth } from '@/stores/reseller-auth';
import { PlatformMark } from '@components/common/platform-logo';
import { Icon } from '@components/icon/icon';
import { Callout } from '@components/shared';
import { Button } from '@components/ui/button';
import { clearResellerToken, setResellerToken } from '@lib/api/client';
import { resellerApi } from '@lib/api/reseller';

export default function AuthCallbackPage() {
  return (
    <React.Suspense fallback={<CallbackLoading />}>
      <CallbackInner />
    </React.Suspense>
  );
}

function CallbackLoading() {
  return (
    <main className="bg-hero-mesh flex min-h-dvh items-center justify-center px-4">
      <div className="bg-panel border-line shadow-pop w-full max-w-md rounded-2xl border p-8 text-center">
        <PlatformMark size={44} className="mx-auto" />
        <p className="type-section-title text-ink mt-5">Signing you in...</p>
        <p className="type-body text-muted mt-2">Verifying your Google reseller account.</p>
      </div>
    </main>
  );
}

function CallbackInner() {
  const { t } = useI18n();
  const params = useSearchParams();
  const router = useRouter();
  const setAuth = useResellerAuth((s) => s.setAuth);

  const token = params.get('token');
  const errorParam = params.get('error');

  const [apiError, setApiError] = React.useState<string | null>(null);

  const errorMessage = React.useMemo(() => {
    if (errorParam === 'account_disabled') {
      return 'Your reseller account has been deactivated by admin. Please contact support.';
    }
    if (errorParam) {
      return `Sign-in failed (${errorParam.replace(/_/g, ' ')}). Please try again.`;
    }
    return apiError;
  }, [errorParam, apiError]);

  React.useEffect(() => {
    if (errorParam) {
      clearResellerToken();
      return;
    }
    if (!token) {
      return;
    }
    let active = true;
    setResellerToken(token);
    resellerApi
      .me()
      .then((me) => {
        if (!active) return;
        if (!me.isActive) {
          clearResellerToken();
          setApiError('Your reseller account is inactive. Please contact support.');
          return;
        }
        setAuth(token, me);
        router.replace('/seller');
      })
      .catch((err) => {
        if (!active) return;
        clearResellerToken();
        setApiError(err instanceof Error ? err.message : 'Failed to verify session.');
      });
    return () => {
      active = false;
    };
  }, [token, errorParam, setAuth, router]);

  if (!token && !errorParam) {
    return (
      <main className="bg-hero-mesh flex min-h-dvh items-center justify-center px-4">
        <div className="bg-panel border-line shadow-pop w-full max-w-md rounded-2xl border p-8 text-center">
          <PlatformMark size={44} className="mx-auto" />
          <h1 className="type-section-title text-ink mt-5">Invalid Callback</h1>
          <p className="type-body text-muted mt-2">No authentication token was provided.</p>
          <Button variant="primary" asChild className="mt-6 w-full">
            <Link href="/login">{t('auth.goToLogin')}</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="bg-hero-mesh flex min-h-dvh items-center justify-center px-4">
        <div className="bg-panel border-line shadow-pop w-full max-w-md rounded-2xl border p-8 text-center">
          <PlatformMark size={44} className="mx-auto" />
          <h1 className="type-section-title text-ink mt-5">Sign-In Blocked</h1>
          <Callout tone="danger" compact className="mt-4 text-left" description={errorMessage} />
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Button variant="primary" asChild>
              <Link href="/login">
                <Icon name="login" size={16} />
                {t('auth.goToLogin')}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">{t('site.home')}</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return <CallbackLoading />;
}
