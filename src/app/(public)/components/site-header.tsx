import { Suspense } from 'react';
import Link from 'next/link';

import { NotificationBell } from '@/features/notifications/notification-bell';
import type { CategoryTreeDTO } from '@/types';
import { IconText } from '@components/common/icon-text';
import { Logo } from '@components/common/logo';
import { Icon } from '@components/icon/icon';

import {
  CartButton,
  HeaderSearch,
  type HeaderUser,
  UserMenu,
  WishlistLink,
} from './header-actions';
import { MobileNav } from './mobile-nav';
import { NAV_LINKS } from './nav-links';

type Props = {
  categories: CategoryTreeDTO[];
  user: HeaderUser;
  supportPhone: string;
  announcement?: string;
  /** Signed-in visitors only. */
  notifications: React.ComponentProps<typeof NotificationBell> | null;
};

export function SiteHeader({ categories, user, supportPhone, announcement, notifications }: Props) {
  return (
    <header className="sticky top-0 z-40 shadow-[0_1px_0_var(--color-line)]">
      {/* Utility bar */}
      <div className="bg-noir-2 text-noir-fg hidden text-[12px] sm:block">
        <div className="container-page flex h-8 items-center justify-between gap-4">
          <p className="cap-trim whitespace-nowrap">
            <span className="text-brand-300 font-semibold">
              {announcement || 'Cash on Delivery'}
            </span>
            {!announcement && ' all over Bangladesh'}
          </p>
          {/* Order tracking lives in the main nav ("Track your order"), not here. */}
          <nav className="flex shrink-0 items-center gap-5" aria-label="Help">
            <Link href="/contact" className="cap-trim hover:text-white">
              Help & contact
            </Link>
            {/* <a href={`tel:${supportPhone}`} className="hover:text-white">
              <IconText
                icon="phone"
                iconSize={13}
                iconClassName="text-brand-400"
                className="gap-1.5"
              >
                {supportPhone}
              </IconText>
            </a> */}
          </nav>
        </div>
      </div>

      {/* Main bar */}
      <div className="bg-noir text-white">
        <div className="container-page grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-3 lg:h-[76px] lg:grid-cols-[200px_minmax(0,1fr)_auto] lg:gap-8">
          {/* menu (mobile) */}
          <div className="flex items-center lg:hidden">
            <MobileNav categories={categories} supportPhone={supportPhone} />
          </div>
          {/* logo — centred in its own cell (horizontally on mobile, vertically everywhere) */}
          <div className="flex h-full items-center justify-center lg:justify-start">
            <Logo tone="light" size="md" />
          </div>
          {/* search (desktop) */}
          <div className="hidden lg:block">
            <Suspense>
              <HeaderSearch />
            </Suspense>
          </div>
          {/* actions */}
          <div className="flex items-center justify-end gap-0.5 sm:gap-1.5">
            <div className="hidden sm:block">
              <UserMenu user={user} />
            </div>
            <div className="hidden sm:block">
              <WishlistLink />
            </div>
            {notifications && <NotificationBell {...notifications} tone="light" />}
            <CartButton />
          </div>
        </div>
        {/* search (mobile / tablet) */}
        <div className="container-page pb-3 lg:hidden">
          <Suspense>
            <HeaderSearch className="h-10" />
          </Suspense>
        </div>
      </div>

      {/* Category + section nav (desktop) */}
      <nav className="hidden bg-white lg:block" aria-label="Main">
        <div className="container-page flex h-12 items-center gap-7">
          <div className="group relative h-full">
            <button
              type="button"
              className="bg-brand-soft text-brand-ink flex h-full items-center gap-2 px-4 text-[13.5px] font-semibold"
            >
              <IconText icon="menu" iconSize={17} className="gap-2">
                All categories
              </IconText>
              <Icon name="chevDown" size={14} className="opacity-60" />
            </button>
            {categories.length > 0 && (
              <div className="invisible absolute top-full left-0 z-50 w-[640px] opacity-0 transition duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <div className="bg-panel shadow-modal border-line grid grid-cols-2 gap-x-6 gap-y-5 rounded-b-xl border p-6">
                  {categories.map((c) => (
                    <div key={c.id}>
                      <Link
                        href={`/products?category=${c.slug}`}
                        className="text-ink hover:text-accent text-[13.5px] font-bold"
                      >
                        {c.name}
                      </Link>
                      {c.children.length > 0 && (
                        <ul className="mt-1.5 space-y-1">
                          {c.children.map((s) => (
                            <li key={s.id}>
                              <Link
                                href={`/products?category=${s.slug}`}
                                className="text-muted hover:text-accent text-[13px]"
                              >
                                {s.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <ul className="flex h-full items-center gap-6 text-[13.5px] font-medium">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={
                    l.accent
                      ? 'font-semibold text-[var(--status-danger-fg)] hover:opacity-80'
                      : 'text-ink hover:text-accent'
                  }
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/track-order" className="text-muted hover:text-ink ml-auto text-[13px]">
            <IconText icon="shipping" iconSize={16} className="gap-1.5">
              Track your order
            </IconText>
          </Link>
        </div>
      </nav>
    </header>
  );
}
