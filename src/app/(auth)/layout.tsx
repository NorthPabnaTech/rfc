import Image from 'next/image';
import Link from 'next/link';

import { Logo } from '@components/common/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="bg-noir-glow relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
        <Logo tone="light" size="md" />
        <div className="my-auto max-w-md">
          <Image
            src="/brand/rfc-mark-light.png"
            alt=""
            width={220}
            height={97}
            className="animate-fade-up mb-10"
          />
          <h2 className="font-display text-5xl leading-tight font-medium">
            Smart gadgets, <span className="text-brand-gradient">delivered.</span>
          </h2>
          <p className="text-noir-fg mt-5 text-lg leading-relaxed">
            Track orders, save addresses and check out faster with your RFC Gadget account.
          </p>
        </div>
        <p className="text-noir-fg text-sm">
          Cash on Delivery · Nationwide shipping · Real support
        </p>
      </aside>
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between lg:justify-end">
          <span className="lg:hidden">
            <Logo size="sm" />
          </span>
          <Link href="/" className="text-muted hover:text-ink text-sm">
            ← Back to store
          </Link>
        </div>
        <div className="mx-auto my-auto w-full max-w-sm py-10">{children}</div>
      </main>
    </div>
  );
}
