import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Callout } from '@components/shared/callout';
import { Button } from '@components/ui/button';
import { param, type SearchParams } from '@lib/search-params';

export const metadata: Metadata = {
  title: 'Verify email',
  robots: { index: false },
  referrer: 'no-referrer',
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const token = param(sp, 'token');

  if (token) {
    redirect(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
  }

  return (
    <>
      <h1 className="type-display text-ink">Verification link expired</h1>
      <Callout tone="warn" className="mt-6">
        This verification link is invalid, already used, or has expired. Register again with the same
        email to receive a fresh link.
      </Callout>
      <div className="mt-6 flex flex-col gap-3">
        <Button asChild variant="noir" size="xl" className="w-full">
          <Link href="/register">Create account again</Link>
        </Button>
        <Button asChild variant="secondary" size="xl" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    </>
  );
}
