'use client';

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
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  panelLabel: string;
  homeHref: string;
};

/**
 * Dark navy sidebar. `collapsed` turns it into an icon rail (desktop);
 * on mobile it renders inside a Sheet.
 */
export function Sidebar({
  groups,
  collapsed = false,
  onToggleCollapse,
  onNavigate,
  panelLabel,
  homeHref,
}: Props) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { t } = useI18n();
  const activeMatch = findActive(groups, pathname, params);

  return (
    <div className="bg-sidebar text-sidebar-fg flex h-full flex-col">
      <div
        className={cn(
          'flex shrink-0 items-center',
          collapsed ? 'flex-col justify-center gap-2 px-2 py-3.5' : 'h-[68px] justify-between px-4',
        )}
      >
        <PlatformLogo tone="light" size="sm" markOnly={collapsed} href={homeHref} />
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
            className="text-sidebar-fg hover:bg-sidebar-raised hover:text-sidebar-fg-strong focus-ring grid size-8 shrink-0 place-items-center rounded-lg transition-colors"
          >
            <Icon
              name="panelLeft"
              size={17}
              className={cn('transition-transform', !collapsed && 'rotate-180')}
            />
          </button>
        )}
      </div>

      <nav
        className="scrollbar-hidden flex-1 overflow-y-auto px-3 pt-2 pb-6"
        aria-label={panelLabel}
      >
        <ul className="space-y-1">
          {groups
            .flatMap((group) => group.items)
            .map((item) => (
              <li key={item.href + item.label}>
                <NavLink
                  item={item}
                  active={activeMatch?.item === item}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                  label={t(item.label)}
                />
              </li>
            ))}
        </ul>
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
        'focus-ring group relative flex items-center gap-3 rounded-lg text-[13.5px] transition-colors',
        collapsed ? 'mx-auto size-10 justify-center' : 'h-[38px] px-3',
        active
          ? 'bg-sidebar-active font-semibold text-white'
          : 'hover:bg-sidebar-raised hover:text-sidebar-fg-strong font-medium',
      )}
    >
      <Icon
        name={item.icon}
        size={18}
        className={cn(
          active ? 'text-white' : 'text-sidebar-fg group-hover:text-sidebar-fg-strong',
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
