'use client';

import * as React from 'react';
import Link from 'next/link';

import { useI18n } from '@/i18n/provider';
import { useResellerAuth } from '@/stores/reseller-auth';
import type { Role } from '@/types/platform';
import { PlatformMark } from '@components/common/platform-logo';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@components/ui/sheet';
import type { NavGroup } from '@config/navigation';
import { PLATFORM } from '@config/platform';
import { cn } from '@lib/utils';

import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

const COLLAPSE_KEY = 'dash-sidebar-collapsed';

/**
 * Role-specific dashboard frame: sidebar (full / icon rail on desktop, drawer
 * on mobile) + top bar + content. Admin and Seller each mount their own shell
 * with their own navigation — the two dashboards never share pages.
 *
 * Phase 1 demo auth: the role comes from the demo session in the store.
 * Phase 2 replaces this guard with a server-verified session (proxy + layout).
 */
export function DashboardShell({
  role,
  groups,
  children,
}: {
  role: Role;
  groups: NavGroup[];
  children: React.ReactNode;
}) {
  const { initialized, loading, reseller, init } = useResellerAuth();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  // Read the saved rail state once (the skeleton renders until hydrated, so
  // the server/client difference never reaches the markup).
  const [collapsed, setCollapsed] = React.useState(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    void init();
  }, [init]);

  const toggleCollapse = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !c;
    });

  if (!initialized || loading) return <ShellSkeleton />;
  if (!reseller || role !== 'seller') return <AccessDenied />;

  const panelLabel = t('nav.sellerPanel');
  const home = '/seller';

  return (
    <div className="bg-surface flex min-h-dvh">
      <aside
        className={cn(
          'border-sidebar-border sticky top-0 hidden h-dvh shrink-0 border-r transition-[width] duration-200 lg:block',
          collapsed ? 'w-[72px]' : 'w-[248px]',
        )}
      >
        <React.Suspense>
          <Sidebar
            groups={groups}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
            panelLabel={panelLabel}
            homeHref={home}
          />
        </React.Suspense>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[260px] max-w-[85vw] gap-0 border-0 p-0 [&>button]:text-white"
        >
          <SheetTitle className="sr-only">{panelLabel}</SheetTitle>
          <React.Suspense>
            <Sidebar
              groups={groups}
              panelLabel={panelLabel}
              homeHref={home}
              onNavigate={() => setMobileOpen(false)}
            />
          </React.Suspense>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <React.Suspense>
          <Topbar role={role} groups={groups} onMenu={() => setMobileOpen(true)} />
        </React.Suspense>
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          {children}
        </main>
        <footer className="text-subtle border-line border-t px-4 py-3 text-center text-[11.5px] sm:px-8">
          {PLATFORM.name} · {t('nav.sellerPanel')}
        </footer>
      </div>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="bg-surface flex min-h-dvh">
      <div className="bg-sidebar hidden w-[272px] shrink-0 lg:block" />
      <div className="flex-1">
        <div className="border-line bg-panel h-[68px] border-b" />
        <div className="space-y-4 p-6 lg:p-8">
          <div className="skeleton h-8 w-60" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-32 rounded-2xl" />
            ))}
          </div>
          <div className="skeleton h-80 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function AccessDenied() {
  const { t } = useI18n();
  return (
    <main className="bg-hero-mesh flex min-h-dvh items-center justify-center px-4">
      <div className="bg-panel border-line shadow-pop w-full max-w-md rounded-2xl border p-8 text-center">
        <PlatformMark size={48} className="mx-auto" />
        <h1 className="type-section-title text-ink mt-5">{t('auth.accessDenied')}</h1>
        <p className="type-body text-muted mt-2">
          {t('auth.accessDeniedDesc', {
            role: t('nav.sellerPanel'),
          })}
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Button variant="primary" asChild>
            <Link href="/login">
              <Icon name="login" size={16} />
              {t('auth.goToLogin')}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/register">{t('auth.register')}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
