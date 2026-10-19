'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { logoutAction } from '@/actions/auth';
import { Taka } from '@/features/products/price';
import { selectCount, selectSubtotal, useCart } from '@/stores/cart-store';
import { useWishlist } from '@/stores/wishlist-store';
import { Icon } from '@components/icon/icon';
import { Dropdown } from '@components/ui/dropdown';
import { useHydrated } from '@hooks/use-hydrated';
import { cn } from '@lib/utils';

export type HeaderUser = { name: string; role: 'customer' | 'admin'; avatarUrl?: string } | null;

const action =
  'focus-ring relative flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-white/90 transition-colors hover:bg-white/8 hover:text-white';

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="bg-brand text-brand-contrast absolute -top-1.5 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] leading-none font-bold">
      {count > 99 ? '99+' : count}
    </span>
  );
}

/** Two-line label beside header icons on large screens. */
function ActionLabel({ top, bottom }: { top: string; bottom: React.ReactNode }) {
  return (
    <span className="cap-trim hidden text-left xl:block">
      <span className="block text-[11px] leading-tight text-white/55">{top}</span>
      <span className="mt-1 block text-[13px] leading-tight font-semibold">{bottom}</span>
    </span>
  );
}

export function CartButton() {
  const hydrated = useHydrated();
  const count = useCart(selectCount);
  const subtotal = useCart(selectSubtotal);
  const open = useCart((s) => s.open);
  const n = hydrated ? count : 0;
  return (
    <button type="button" onClick={open} className={action} aria-label={`Open cart (${n} items)`}>
      <span className="relative">
        <Icon name="bag" size={22} />
        <CountBadge count={n} />
      </span>
      <ActionLabel top="My cart" bottom={<Taka amount={hydrated ? subtotal : 0} />} />
    </button>
  );
}

export function WishlistLink() {
  const hydrated = useHydrated();
  const count = useWishlist((s) => s.ids.length);
  const n = hydrated ? count : 0;
  return (
    <Link href="/wishlist" className={action} aria-label={`Wishlist (${n} items)`}>
      <span className="relative">
        <Icon name="heart" size={22} />
        <CountBadge count={n} />
      </span>
      <ActionLabel top="Saved" bottom="Wishlist" />
    </Link>
  );
}

export function UserMenu({ user }: { user: HeaderUser }) {
  if (!user) {
    return (
      <Link href="/login" className={action} aria-label="Sign in or register">
        <Icon name="user" size={22} />
        <ActionLabel top="Welcome" bottom="Sign in / Register" />
      </Link>
    );
  }

  const items = [
    { label: 'My account', href: '/account', icon: 'userCircle' as const },
    { label: 'My orders', href: '/account/orders', icon: 'box' as const },
    { label: 'Addresses', href: '/account/addresses', icon: 'location' as const },
    { label: 'Wishlist', href: '/wishlist', icon: 'heart' as const },
    ...(user.role === 'admin'
      ? [{ label: 'Admin panel', href: '/admin', icon: 'grid' as const }]
      : []),
  ];

  return (
    <Dropdown
      width={220}
      content={(close) => (
        <div className="p-1.5">
          <div className="px-2.5 pt-1.5 pb-2">
            <p className="text-muted text-[11px] tracking-wide uppercase">Signed in as</p>
            <p className="text-ink truncate text-sm font-semibold">{user.name}</p>
          </div>
          <div className="bg-line my-1 h-px" />
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={close}
              className="text-ink hover:bg-well flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px]"
            >
              <Icon name={it.icon} size={16} className="text-muted" />
              {it.label}
            </Link>
          ))}
          <div className="bg-line my-1 h-px" />
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-ink hover:bg-well flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px]"
            >
              <Icon name="logout" size={16} className="text-muted" />
              Sign out
            </button>
          </form>
        </div>
      )}
    >
      <button type="button" className={action} aria-label="Account menu">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- tiny avatar, already optimized by Cloudinary
          <img
            src={user.avatarUrl}
            alt=""
            className="size-[26px] rounded-full object-cover ring-1 ring-white/30"
          />
        ) : (
          <span className="bg-brand-gradient text-brand-contrast grid size-[26px] place-items-center rounded-full text-[12px] font-bold">
            {user.name.charAt(0).toUpperCase()}
          </span>
        )}
        <ActionLabel top="Hello," bottom={user.name.split(' ')[0] ?? 'Account'} />
      </button>
    </Dropdown>
  );
}

/** Store search: submits to /products?q=… so results are a real, shareable URL. */
export function HeaderSearch({ className }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = React.useState(params.get('q') ?? '');
  return (
    <form
      role="search"
      className={cn('flex h-11 w-full overflow-hidden rounded-xl bg-white', className)}
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        router.push(term ? `/products?q=${encodeURIComponent(term)}` : '/products');
      }}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        placeholder="Search for products…"
        aria-label="Search products"
        className="text-ink placeholder:text-subtle h-full min-w-0 flex-1 bg-transparent px-4 text-sm outline-none"
      />
      <button
        type="submit"
        aria-label="Search"
        className="bg-brand text-brand-contrast hover:bg-brand-hover grid w-14 shrink-0 place-items-center transition-colors"
      >
        <Icon name="search" size={19} />
      </button>
    </form>
  );
}
