'use client';

import * as React from 'react';
import Link from 'next/link';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import type { AppNotification, NotificationKind, Role } from '@/types/platform';
import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { Dropdown } from '@components/ui/dropdown';
import { cn } from '@lib/utils';

export const KIND_ICON: Record<NotificationKind, IconRegistryKey> = {
  order: 'cart',
  status: 'shipping',
  payment: 'moneyAdd',
  withdrawal: 'moneySend',
  earning: 'moneyBag',
  account: 'userCircle',
};

const KIND_TONE: Record<NotificationKind, string> = {
  order: 'bg-brand-soft text-brand-ink',
  status: 'bg-[var(--status-info-bg)] text-[var(--status-info-fg)]',
  payment: 'bg-[var(--status-ok-bg)] text-[var(--status-ok-fg)]',
  withdrawal: 'bg-highlight-soft text-[var(--color-sun-600)] dark:text-[var(--color-sun-300)]',
  earning: 'bg-[var(--status-ok-bg)] text-[var(--status-ok-fg)]',
  account: 'bg-well text-muted',
};

/** Notifications visible to the current role (seller: only their own). */
export function useMyNotifications(role: Role) {
  const all = usePlatformStore((s) => s.notifications);
  const session = usePlatformStore((s) => s.session);
  return React.useMemo(
    () =>
      all.filter(
        (n) => n.audience === role && (role === 'admin' || n.sellerId === session?.userId),
      ),
    [all, role, session?.userId],
  );
}

export function NotificationRow({ n, onClick }: { n: AppNotification; onClick?: () => void }) {
  const { relative, tx } = useI18n();
  const content = (
    <div className={cn('flex gap-3 rounded-lg p-2.5 text-left transition-colors', 'hover:bg-well')}>
      <span
        className={cn('grid size-9 shrink-0 place-items-center rounded-full', KIND_TONE[n.kind])}
      >
        <Icon name={KIND_ICON[n.kind]} size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span
            className={cn(
              'text-[14px] leading-snug',
              n.read ? 'text-ink font-medium' : 'text-ink font-bold',
            )}
          >
            {n.title}
          </span>
          {!n.read && (
            <span
              className="bg-highlight mt-1.5 size-2 shrink-0 rounded-full"
              aria-label="unread"
            />
          )}
        </span>
        <span className="text-muted mt-0.5 block text-xs leading-snug">{n.body}</span>
        <span className="text-subtle mt-1 block text-[11px]">
          {tx(`notifications.kinds.${n.kind}`)} · {relative(n.createdAt)}
        </span>
      </span>
    </div>
  );
  return n.href ? (
    <Link href={n.href} onClick={onClick} className="focus-ring block rounded-lg">
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className="focus-ring block w-full rounded-lg">
      {content}
    </button>
  );
}

export function NotificationBell({ role }: { role: Role }) {
  const list = useMyNotifications(role);
  const markRead = usePlatformStore((s) => s.markNotificationRead);
  const markAll = usePlatformStore((s) => s.markAllNotificationsRead);
  const session = usePlatformStore((s) => s.session);
  const { t, num } = useI18n();
  const unread = list.filter((n) => !n.read).length;
  const base = role === 'admin' ? '/admin' : '/seller';

  return (
    <Dropdown
      align="end"
      width={360}
      content={(close) => (
        <div className="-m-1">
          <div className="border-line flex items-center justify-between border-b px-3 py-2.5">
            <span className="type-card-title text-ink">{t('common.notifications')}</span>
            {unread > 0 && (
              <button
                type="button"
                className="text-accent text-xs font-semibold"
                onClick={() => markAll(role, session?.userId)}
              >
                {t('common.markAllRead')}
              </button>
            )}
          </div>
          <div className="max-h-[380px] overflow-y-auto p-1.5">
            {list.length === 0 ? (
              <p className="text-muted py-8 text-center text-sm">{t('common.noNotifications')}</p>
            ) : (
              list.slice(0, 7).map((n) => (
                <NotificationRow
                  key={n.id}
                  n={n}
                  onClick={() => {
                    markRead(n.id);
                    close();
                  }}
                />
              ))
            )}
          </div>
          <div className="border-line border-t p-1.5">
            <Link
              href={`${base}/notifications`}
              onClick={close}
              className="text-accent hover:bg-well block rounded-md py-2 text-center text-xs font-semibold"
            >
              {t('common.viewAll')}
            </Link>
          </div>
        </div>
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={t('common.notifications')}
      >
        <Icon name="bell" size={19} />
        {unread > 0 && (
          <span className="bg-highlight text-highlight-contrast num absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold">
            {num(Math.min(unread, 9))}
            {unread > 9 ? '+' : ''}
          </span>
        )}
      </Button>
    </Dropdown>
  );
}
