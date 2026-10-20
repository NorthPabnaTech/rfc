import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@components/ui/button';

export default function NotFound() {
  return (
    <main className="bg-noir-glow flex min-h-dvh flex-col items-center justify-center px-6 text-center text-white">
      <Image
        src="/brand/rfc-mark-light.png"
        alt=""
        width={180}
        height={79}
        className="opacity-90"
      />
      <p className="text-brand-300 mt-8 text-[11px] font-bold tracking-[0.3em] uppercase">
        Error 404
      </p>
      <h1 className="font-display mt-3 text-4xl font-medium sm:text-5xl">
        This page went shopping.
      </h1>
      <p className="text-noir-fg mt-4 max-w-md">
        The page you’re looking for doesn’t exist or has moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button variant="primary" size="xl" asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button
          size="xl"
          asChild
          className="border border-white/15 bg-white/5 text-white hover:bg-white/10"
        >
          <Link href="/products">Browse products</Link>
        </Button>
      </div>
    </main>
  );
}
