'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { logoutAction } from '@/actions/auth';
import { Logo } from '@components/common/logo';
import { Icon } from '@components/icon/icon';
import { Sheet, SheetContent, SheetTitle } from '@components/ui/sheet';
import { cn } from '@lib/utils';

import { ADMIN_NAV } from './admin-nav';

export type AdminBadges = {
  pendingOrders: number;
  openReturns: number;
  unansweredQuestions: number;
};

type Props = { badges: AdminBadges; user: { name: string; email: string } };

function NavLinks({ badges, onNavigate }: { badges: AdminBadges; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Admin">
      {ADMIN_NAV.map((group) => (
        <div key={group.title}>
          <p className="text-sidebar-muted px-3 pb-2 text-[10.5px] font-semibold tracking-[0.14em] uppercase">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const count = item.badge ? badges[item.badge] : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                      active
                        ? 'bg-sidebar-active text-brand-contrast'
                        : 'text-sidebar-fg hover:bg-sidebar-raised hover:text-sidebar-fg-strong',
                    )}
                  >
                    <Icon name={item.icon} size={18} />
                    <span className="flex-1">{item.label}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          'grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10.5px] font-bold',
                          active ? 'bg-noir text-white' : 'bg-brand text-brand-contrast',
                        )}
                      >
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserFooter({ user }: Pick<Props, 'user'>) {
  return (
    <div className="border-sidebar-border flex items-center gap-3 border-t px-4 py-4">
      <span className="bg-brand-gradient text-brand-contrast grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold">
        {user.name.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sidebar-fg-strong truncate text-[13px] font-semibold">{user.name}</p>
        <p className="text-sidebar-muted truncate text-[11.5px]">{user.email}</p>
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          aria-label="Sign out"
          title="Sign out"
          className="text-sidebar-fg hover:bg-sidebar-raised hover:text-sidebar-fg-strong grid size-8 place-items-center rounded-lg"
        >
          <Icon name="logout" size={17} />
        </button>
      </form>
    </div>
  );
}

export function AdminSidebar({ badges, user }: Props) {
  return (
    <aside className="bg-sidebar sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col lg:flex">
      <div className="border-sidebar-border flex h-16 items-center border-b px-5">
        <Logo tone="light" size="sm" href="/admin/dashboard" />
      </div>
      <NavLinks badges={badges} />
      <UserFooter user={user} />
    </aside>
  );
}

export function AdminMobileNav({ badges, user }: Props) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="text-ink hover:bg-well grid size-9 place-items-center rounded-lg lg:hidden"
      >
        <Icon name="menu" size={20} />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="bg-sidebar w-[260px] gap-0 border-r-0 p-0">
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          <div className="border-sidebar-border flex h-16 items-center border-b px-5">
            <Logo tone="light" size="sm" href="/admin/dashboard" />
          </div>
          <NavLinks badges={badges} onNavigate={() => setOpen(false)} />
          <UserFooter user={user} />
        </SheetContent>
      </Sheet>
    </>
  );
}
