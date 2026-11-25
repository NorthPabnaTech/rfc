'use client';

import * as React from 'react';
import Link from 'next/link';

import { useI18n } from '@/i18n/provider';
import { Callout } from '@components/shared';
import { Button } from '@components/ui/button';
import { resellerApi } from '@lib/api/reseller';

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

export function LoginView() {
  const { t } = useI18n();
  const [redirecting, setRedirecting] = React.useState(false);

  const handleGoogleLogin = () => {
    setRedirecting(true);
    const callbackUrl = `${window.location.origin}/auth/callback`;
    window.location.href = resellerApi.getGoogleAuthUrl(callbackUrl);
  };

  return (
    <div>
      <h1 className="type-page-title text-ink">{t('auth.welcomeBack')}</h1>
      <p className="type-body text-muted mt-1.5">
        Sign in with your Google account to access your reseller dashboard and prices.
      </p>

      <div className="mt-8 space-y-4">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 w-full gap-3 text-[15px] font-semibold"
          onClick={handleGoogleLogin}
          disabled={redirecting}
        >
          <GoogleMark />
          {redirecting ? 'Redirecting to Google...' : 'Continue with Google'}
        </Button>

        <Callout
          tone="info"
          compact
          description="Resellers sign in exclusively with Google. New reseller accounts are created automatically on your first Google sign-in."
        />
      </div>

      <p className="text-muted mt-8 text-center text-sm">
        <Link href="/products" className="text-accent font-semibold hover:underline">
          {t('site.products')}
        </Link>
      </p>
    </div>
  );
}
