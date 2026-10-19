'use client';

import * as React from 'react';
import Link from 'next/link';

import type { CategoryTreeDTO } from '@/types';
import { IconText } from '@components/common/icon-text';
import { Logo } from '@components/common/logo';
import { Icon } from '@components/icon/icon';
import { Sheet, SheetContent, SheetTitle } from '@components/ui/sheet';
import { cn } from '@lib/utils';

import { NAV_LINKS } from './nav-links';

export function MobileNav({
  categories,
  supportPhone,
}: {
  categories: CategoryTreeDTO[];
  supportPhone: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring grid size-10 place-items-center rounded-full text-white/85 hover:bg-white/10 lg:hidden"
        aria-label="Open menu"
      >
        <Icon name="menu" size={22} />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="bg-noir w-[86%] gap-0 border-r-0 p-0 text-white sm:max-w-sm"
          // Close as soon as any link inside is followed (or the search submits).
          onClickCapture={(e) => (e.target as Element).closest('a') && setOpen(false)}
          onSubmitCapture={() => setOpen(false)}
        >
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="border-noir-line border-b px-5 py-4">
            <Logo tone="light" size="sm" />
          </div>
          <nav className="flex-1 overflow-y-auto px-3 pb-6" aria-label="Categories">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'block rounded-lg px-3 py-3 text-[15px] font-semibold hover:bg-white/5',
                  l.accent && 'text-brand-300',
                )}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/wishlist"
              className="block rounded-lg px-3 py-3 text-[15px] font-semibold hover:bg-white/5"
            >
              Wishlist
            </Link>
            <Link
              href="/account"
              className="block rounded-lg px-3 py-3 text-[15px] font-semibold hover:bg-white/5"
            >
              My account
            </Link>
            <p className="text-noir-fg px-3 pt-4 pb-1 text-[11px] font-semibold tracking-[0.14em] uppercase">
              Categories
            </p>
            <div className="bg-noir-line mx-3 my-2 h-px" />
            {categories.map((c) => (
              <div key={c.id}>
                <div className="flex items-center">
                  <Link
                    href={`/products?category=${c.slug}`}
                    className="flex-1 rounded-lg px-3 py-3 text-[15px] text-white/90 hover:bg-white/5"
                  >
                    {c.name}
                  </Link>
                  {c.children.length > 0 && (
                    <button
                      type="button"
                      aria-label={`Show ${c.name} sub-categories`}
                      aria-expanded={expanded === c.id}
                      onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                      className="grid size-10 place-items-center rounded-lg text-white/60 hover:bg-white/5"
                    >
                      <Icon
                        name="chevDown"
                        size={16}
                        className={expanded === c.id ? 'rotate-180' : ''}
                      />
                    </button>
                  )}
                </div>
                {expanded === c.id && (
                  <div className="border-noir-line mb-2 ml-4 border-l pl-2">
                    {c.children.map((s) => (
                      <Link
                        key={s.id}
                        href={`/products?category=${s.slug}`}
                        className="text-noir-fg block rounded-lg px-3 py-2 text-sm hover:bg-white/5 hover:text-white"
                      >
                        {s.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
          <div className="border-noir-line text-noir-fg border-t px-5 py-4 text-sm">
            <a href={`tel:${supportPhone}`} className="hover:text-white">
              <IconText icon="phone" iconSize={16} iconClassName="text-brand-400">
                {supportPhone}
              </IconText>
            </a>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
