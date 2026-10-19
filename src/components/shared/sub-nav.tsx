'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@lib/utils';

export type SubNavItem = {
  label: string;
  href: string;
  /** Optional secondary matching URLs (e.g. parent route alias) */
  aliases?: readonly string[];
};

/** Horizontal tab strip for section sub-layouts (Menu, Delivery, Settings, …). */
export function SubNav({ items, className }: { items: readonly SubNavItem[]; className?: string }) {
  const pathname = usePathname();

  // Deterministic active tab: exact match, alias match, or best prefix match
  const activeHref = React.useMemo(() => {
    // 1. Exact match
    const exact = items.find(
      (it) => it.href === pathname || it.aliases?.some((alias) => alias === pathname),
    );
    if (exact) return exact.href;

    // 2. Path prefix match
    const prefixMatches = items
      .filter((it) => pathname.startsWith(`${it.href}/`))
      .sort((a, b) => b.href.length - a.href.length);

    if (prefixMatches[0]) return prefixMatches[0].href;

    // Default to the first tab if within parent section
    return items[0]?.href;
  }, [pathname, items]);

  return (
    <div
      className={cn(
        'flex w-full [scrollbar-width:none] overflow-x-auto [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'shrink-0 border-b-2 px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors',
              active
                ? 'border-brand text-brand font-bold'
                : 'text-muted hover:text-ink border-transparent',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
