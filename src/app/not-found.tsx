import Link from 'next/link';

import { PlatformMark } from '@components/common/platform-logo';
import { Button } from '@components/ui/button';

export default function NotFound() {
  return (
    <main className="bg-noir-glow flex min-h-dvh flex-col items-center justify-center px-6 text-center text-white">
      <PlatformMark size={64} />
      <p className="text-brand-200 mt-8 text-[11px] font-bold tracking-[0.3em] uppercase">
        Error 404 · ত্রুটি ৪০৪
      </p>
      <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">Page not found</h1>
      <p className="text-noir-fg mt-4 max-w-md">
        The page you are looking for does not exist or has moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button
          size="xl"
          asChild
          className="bg-highlight text-highlight-contrast hover:bg-highlight-hover font-bold"
        >
          <Link href="/">Back to home</Link>
        </Button>
        <Button
          size="xl"
          asChild
          className="border border-white/15 bg-white/5 text-white hover:bg-white/10"
        >
          <Link href="/login">Login</Link>
        </Button>
      </div>
    </main>
  );
}
