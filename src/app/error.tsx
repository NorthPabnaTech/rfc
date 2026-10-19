'use client';

import * as React from 'react';
import Link from 'next/link';

import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]">
        <Icon name="alert" size={28} />
      </span>
      <h1 className="type-display text-ink mt-6">Something went wrong</h1>
      <p className="text-muted mt-3 max-w-md">
        We couldn’t load this page. Please try again — if it keeps happening, contact us.
      </p>
      {error.digest && <p className="text-subtle mt-2 text-xs">Reference: {error.digest}</p>}
      <div className="mt-8 flex gap-3">
        <Button variant="noir" size="lg" onClick={reset}>
          <Icon name="refresh" size={16} /> Try again
        </Button>
        <Button variant="secondary" size="lg" asChild>
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </main>
  );
}
