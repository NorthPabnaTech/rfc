'use client';

import * as React from 'react';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import type { Role } from '@/types/platform';
import { Panel } from '@components/dashboard/panel';
import { PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { Tabs } from '@components/ui/tabs';

import { NotificationRow, useMyNotifications } from './notification-bell';
import { LanguageCards, ThemeCards } from './switchers';

export function LanguageSettings() {
  const { t } = useI18n();
  return (
    <Panel
      title={t('admin.settings.languageTitle')}
      description={t('admin.settings.languageSubtitle')}
    >
      <LanguageCards />
      <p className="type-helper text-muted mt-4">{t('admin.settings.fontsNote')}</p>
    </Panel>
  );
}

export function ThemeSettings() {
  const { t } = useI18n();
  return (
    <Panel title={t('admin.settings.themeTitle')} description={t('admin.settings.themeSubtitle')}>
      <ThemeCards />
    </Panel>
  );
}

/** Full notification list for a role, filterable by read state and kind. */
export function NotificationsPage({ role }: { role: Role }) {
  const { t, num } = useI18n();
  const list = useMyNotifications(role);
  const session = usePlatformStore((s) => s.session);
  const markRead = usePlatformStore((s) => s.markNotificationRead);
  const markAll = usePlatformStore((s) => s.markAllNotificationsRead);
  const [tab, setTab] = React.useState('all');
  const shown =
    tab === 'all'
      ? list
      : tab === 'unread'
        ? list.filter((n) => !n.read)
        : list.filter((n) => n.kind === tab);
  const unread = list.filter((n) => !n.read).length;
  return (
    <div className="space-y-5">
      <PageHeader
        title={t('notifications.title')}
        description={t('notifications.subtitle')}

        actions={
          unread > 0 && (
            <Button variant="secondary" onClick={() => markAll(role, session?.userId)}>
              {t('common.markAllRead')}
            </Button>
          )
        }
      />
      <Tabs
        variant="line"
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'all', label: t('common.all') },
          { value: 'unread', label: `${t('notifications.unread')} (${num(unread)})` },
          ...(['order', 'status', 'payment', 'withdrawal', 'earning', 'account'] as const).map(
            (k) => ({ value: k, label: t(`notifications.kinds.${k}`) }),
          ),
        ]}
      />
      <Panel>
        <div className="-mx-2 pt-3">
          {shown.length === 0 ? (
            <p className="text-muted py-12 text-center text-sm">{t('common.noNotifications')}</p>
          ) : (
            shown.map((n) => <NotificationRow key={n.id} n={n} onClick={() => markRead(n.id)} />)
          )}
        </div>
      </Panel>
    </div>
  );
}
