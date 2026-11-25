'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import type { Role } from '@/types/platform';
import { Icon } from '@components/icon/icon';
import { NotificationBell } from '@components/platform/notification-bell';
import { LanguageSwitcher, ThemeSwitcher } from '@components/platform/switchers';
import { UserAvatar } from '@components/platform/user-avatar';
import { Button } from '@components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@components/ui/command';
import { Dropdown } from '@components/ui/dropdown';
import type { NavGroup } from '@config/navigation';
import { cn } from '@lib/utils';

import { findActive } from './sidebar';

export function Topbar({
  role,
  groups,
  onMenu,
  onToggleCollapse,
  collapsed,
}: {
  role: Role;
  groups: NavGroup[];
  onMenu: () => void;
  onToggleCollapse: () => void;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { t } = useI18n();
  const active = findActive(groups, pathname, params);
  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="bg-panel/85 border-line sticky top-0 z-30 flex h-[68px] shrink-0 items-center gap-2 border-b px-3 backdrop-blur-md sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenu}
        aria-label={t('common.menu')}
      >
        <Icon name="menu" size={20} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:inline-flex"
        onClick={onToggleCollapse}
        aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
      >
        <Icon
          name="panelLeft"
          size={19}
          className={cn('transition-transform', !collapsed && 'rotate-180')}
        />
      </Button>

      <div className="min-w-0 flex-1">
        {active && (
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[14.5px]">
            <span className="text-muted hidden truncate sm:inline">{t(active.group.label)}</span>
            <Icon name="chevRight" size={13} className="text-subtle hidden sm:block" />
            <span className="text-ink truncate font-semibold">{t(active.item.label)}</span>
          </nav>
        )}
      </div>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="border-line bg-well/60 text-muted hover:text-ink focus-ring hidden h-10 w-72 items-center gap-2 rounded-xl border px-3.5 text-[14px] md:flex"
      >
        <Icon name="search" size={16} />
        <span className="flex-1 text-left">{t('nav.searchPages')}</span>
        <kbd className="kbd">Ctrl K</kbd>
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setSearchOpen(true)}
        aria-label={t('common.search')}
      >
        <Icon name="search" size={19} />
      </Button>

      <NotificationBell role={role} />
      <LanguageSwitcher className="hidden sm:inline-flex" />
      <ThemeSwitcher />
      <ProfileMenu role={role} />

      <PageSearch open={searchOpen} onOpenChange={setSearchOpen} groups={groups} />
    </header>
  );
}

function ProfileMenu({ role }: { role: Role }) {
  const session = usePlatformStore((s) => s.session);
  const logout = usePlatformStore((s) => s.logout);
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const base = role === 'admin' ? '/admin' : '/seller';
  return (
    <Dropdown
      align="end"
      width={248}
      items={[
        {
          render: (
            <div className="px-2 py-1.5">
              <div className="text-ink truncate text-[14px] font-semibold">{session?.name}</div>
              <div className="text-muted truncate text-xs">{session?.email}</div>
            </div>
          ),
          label: '',
        },
        { type: 'separator' },
        {
          label: t('common.profile'),
          icon: 'userCircle',
          onClick: () =>
            router.push(role === 'admin' ? '/admin/settings/profile' : '/seller/profile'),
        },
        {
          label: t('common.settings'),
          icon: 'settings',
          onClick: () => router.push(role === 'admin' ? '/admin/settings' : '/seller/settings'),
        },
        {
          label: t('common.notifications'),
          icon: 'bell',
          onClick: () => router.push(`${base}/notifications`),
        },
        {
          label: locale === 'bn' ? 'English' : 'বাংলা',
          icon: 'globe',
          onClick: () => setLocale(locale === 'bn' ? 'en' : 'bn'),
        },
        { type: 'separator' },
        {
          label: t('common.signOut'),
          icon: 'logout',
          destructive: true,
          onClick: () => {
            logout();
            router.push('/login');
          },
        },
      ]}
    >
      <button
        type="button"
        className="focus-ring hover:bg-well ml-1 flex items-center gap-2 rounded-full p-0.5 pr-1 sm:pr-2.5"
      >
        <UserAvatar name={session?.name ?? '?'} size={36} />
        <span className="hidden max-w-32 truncate text-left text-[14px] leading-tight lg:block">
          <span className="text-ink block truncate font-semibold">{session?.name}</span>
          <span className="text-muted block truncate text-[11px]">
            {role === 'admin' ? t('auth.demoAdmin') : t('auth.demoSeller')}
          </span>
        </span>
        <Icon name="chevDown" size={14} className="text-muted hidden lg:block" />
      </button>
    </Dropdown>
  );
}

function PageSearch({
  open,
  onOpenChange,
  groups,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  groups: NavGroup[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('nav.searchPages')}
      description={t('nav.searchPages')}
    >
      <CommandInput placeholder={t('nav.searchPages')} />
      <CommandList>
        <CommandEmpty>{t('nav.noPages')}</CommandEmpty>
        {groups.map((g) => (
          <CommandGroup key={g.label} heading={t(g.label)}>
            {g.items.map((item) => (
              <CommandItem
                key={item.href + item.label}
                value={`${t(item.label)} ${t(g.label)}`}
                onSelect={() => {
                  onOpenChange(false);
                  router.push(item.href);
                }}
              >
                <Icon name={item.icon} size={18} className="text-muted" />
                {t(item.label)}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
