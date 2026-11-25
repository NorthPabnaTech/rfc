'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { useI18n } from '@/i18n/provider';
import { PlatformLogo } from '@components/common/platform-logo';
import { Icon } from '@components/icon/icon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/ui/tooltip';
import type { NavGroup, NavItem } from '@config/navigation';
import { cn } from '@lib/utils';

export function isNavActive(
  item: NavItem,
  pathname: string,
  params: URLSearchParams | null,
): boolean {
  const base = item.href.split('?')[0]!;
  if (item.query) {
    if (pathname !== base) return false;
    const v = params?.get(item.query.key) ?? null;
    return (v || null) === item.query.value;
  }
  if (item.exact) return pathname === base;
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** The deepest matching item (for breadcrumb / page title). */
export function findActive(groups: NavGroup[], pathname: string, params: URLSearchParams | null) {
  let best: { group: NavGroup; item: NavItem } | null = null;
  for (const group of groups) {
    for (const item of group.items) {
      if (!isNavActive(item, pathname, params)) continue;
      if (!best || item.href.length > best.item.href.length) best = { group, item };
    }
  }
  return best;
}

type Props = {
  groups: NavGroup[];
  collapsed?: boolean;
  onNavigate?: () => void;
  panelLabel: string;
  homeHref: string;
};

/**
 * Dark navy sidebar with collapsible groups. `collapsed` turns it into an
 * icon rail (desktop); on mobile it renders inside a Sheet.
 */
export function Sidebar({ groups, collapsed = false, onNavigate, panelLabel, homeHref }: Props) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { t } = useI18n();
  const [closed, setClosed] = React.useState<Record<string, boolean>>({});

  return (
    <div className="bg-sidebar text-sidebar-fg flex h-full flex-col">
      <div
        className={cn(
          'flex h-[68px] shrink-0 items-center',
          collapsed ? 'justify-center px-2' : 'px-5',
        )}
      >
        <PlatformLogo tone="light" size="md" markOnly={collapsed} href={homeHref} />
      </div>
      {!collapsed && (
        <div className="px-5 pb-3">
          <span className="border-sidebar-border text-sidebar-muted inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.1em] uppercase">
            <span className="bg-brand-400 size-1.5 rounded-full" />
            {panelLabel}
          </span>
        </div>
      )}

      <nav
        className="scrollbar-hidden flex-1 overflow-y-auto px-3 pt-2 pb-6"
        aria-label={panelLabel}
      >
        {groups.map((group) => {
          const isClosed = closed[group.label] && !collapsed;
          const hasActive = group.items.some((i) => isNavActive(i, pathname, params));
          return (
            <div key={group.label} className="mb-4">
              {collapsed ? (
                <div className="border-sidebar-border mx-3 my-3 border-t first:hidden" />
              ) : (
                <button
                  type="button"
                  onClick={() => setClosed((c) => ({ ...c, [group.label]: !c[group.label] }))}
                  className="text-sidebar-muted hover:text-sidebar-fg-strong focus-ring flex w-full items-center justify-between rounded-md px-3 py-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase"
                  aria-expanded={!isClosed}
                >
                  <span className="flex items-center gap-1.5">
                    {t(group.label)}
                    {isClosed && hasActive && (
                      <span className="bg-brand-400 size-1.5 rounded-full" />
                    )}
                  </span>
                  <Icon
                    name="chevDown"
                    size={13}
                    className={cn('transition-transform', isClosed && '-rotate-90')}
                  />
                </button>
              )}
              <div className={cn('submenu', !isClosed && 'open')}>
                <div>
                  <ul className="mt-1.5 space-y-1">
                    {group.items.map((item) => (
                      <li key={item.href + item.label}>
                        <NavLink
                          item={item}
                          active={isNavActive(item, pathname, params)}
                          collapsed={collapsed}
                          onNavigate={onNavigate}
                          label={t(item.label)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
  label,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
  label: string;
}) {
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'focus-ring group relative flex items-center gap-3 rounded-xl text-[14.5px] transition-colors',
        collapsed ? 'mx-auto size-11 justify-center' : 'h-[42px] px-3.5',
        active
          ? 'from-brand-500 to-brand-600 bg-gradient-to-r font-semibold text-white shadow-[0_8px_20px_-8px_var(--color-sidebar-glow)]'
          : 'hover:bg-sidebar-raised hover:text-sidebar-fg-strong font-medium',
      )}
    >
      <Icon
        name={item.icon}
        size={20}
        className={cn(
          active ? 'text-white' : 'text-sidebar-muted group-hover:text-sidebar-fg-strong',
        )}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
