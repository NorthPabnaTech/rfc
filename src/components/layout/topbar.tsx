'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';

import { useI18n } from '@/i18n/provider';
import { useResellerAuth } from '@/stores/reseller-auth';
import type { Role } from '@/types/platform';
import { Icon } from '@components/icon/icon';
import { NotificationBell } from '@components/platform/notification-bell';
import { LanguageSwitcher, ThemeSwitcher } from '@components/platform/switchers';
import { UserAvatar } from '@components/platform/user-avatar';
import { Button } from '@components/ui/button';
import { Dropdown } from '@components/ui/dropdown';
import type { NavGroup } from '@config/navigation';

import { findActive } from './sidebar';

export function Topbar({
  role,
  groups,
  onMenu,
}: {
  role: Role;
  groups: NavGroup[];
  onMenu: () => void;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { t } = useI18n();
  const active = findActive(groups, pathname, params);

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

      <div className="min-w-0 flex-1">
        {active && (
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[14.5px]">
            <span className="text-muted hidden truncate sm:inline">{t(active.group.label)}</span>
            <Icon name="chevRight" size={13} className="text-subtle hidden sm:block" />
            <span className="text-ink truncate font-semibold">{t(active.item.label)}</span>
          </nav>
        )}
      </div>

      <NotificationBell role={role} />
      <LanguageSwitcher className="hidden sm:inline-flex" />
      <ThemeSwitcher />
      <ProfileMenu role={role} />
    </header>
  );
}

function ProfileMenu({ role }: { role: Role }) {
  const reseller = useResellerAuth((s) => s.reseller);
  const logout = useResellerAuth((s) => s.logout);
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
              <div className="text-ink truncate text-[14px] font-semibold">{reseller?.name}</div>
              <div className="text-muted truncate text-xs">{reseller?.email}</div>
            </div>
          ),
          label: '',
        },
        { type: 'separator' },
        {
          label: t('common.profile'),
          icon: 'userCircle',
          onClick: () => router.push('/seller/profile'),
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
        <UserAvatar name={reseller?.name ?? '?'} src={reseller?.avatarUrl} size={36} />
        <span className="hidden max-w-32 truncate text-left text-[14px] leading-tight lg:block">
          <span className="text-ink block truncate font-semibold">{reseller?.name}</span>
          <span className="text-muted block truncate text-[11px]">
            {reseller?.shopName || t('nav.sellerPanel')}
          </span>
        </span>
        <Icon name="chevDown" size={14} className="text-muted hidden lg:block" />
      </button>
    </Dropdown>
  );
}
