import type { Metadata } from 'next';
import Link from 'next/link';

import { isResetTokenValid } from '@/services/users';
import { Callout } from '@components/shared/callout';
import { Button } from '@components/ui/button';
import { param, type SearchParams } from '@lib/search-params';

import { ResetPasswordForm } from './components/reset-password-form';

export const metadata: Metadata = {
  title: 'Set a new password',
  robots: { index: false },
  // The token is in the URL — never leak it to other sites via Referer.
  referrer: 'no-referrer',
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const token = param(await searchParams, 'token');
  const valid = !!token && token.length <= 200 && (await isResetTokenValid(token));

  if (!valid) {
    return (
      <>
        <h1 className="type-display text-ink">Link expired</h1>
        <Callout tone="warn" className="mt-6">
          This reset link is invalid, already used or has expired. Request a new one to continue.
        </Callout>
        <Button asChild variant="noir" size="xl" className="mt-6 w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <h1 className="type-display text-ink">Set a new password</h1>
      <p className="text-muted mt-2 text-sm">
        Choose a new password. You&apos;ll be signed out on your other devices.
      </p>
      <ResetPasswordForm token={token} />
    </>
  );
}
