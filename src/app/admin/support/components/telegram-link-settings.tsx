'use client';

import * as React from 'react';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import { Panel } from '@components/dashboard/panel';
import { Icon } from '@components/icon/icon';
import { TelegramCard } from '@components/platform/telegram-card';
import { Callout, PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { toast } from '@lib/toast';
import { telegramLink } from '@lib/validators/reseller';

/** Configure one Telegram link (support or community) with a live preview. */
export function TelegramLinkSettings({ kind }: { kind: 'support' | 'group' }) {
  const { t } = useI18n();
  const settings = usePlatformStore((s) => s.settings);
  const update = usePlatformStore((s) => s.updateSettings);
  const key = kind === 'support' ? 'telegramSupport' : 'telegramGroup';
  const [value, setValue] = React.useState(settings[key]);
  const [error, setError] = React.useState<string | null>(null);
  const schema = React.useMemo(() => telegramLink(t), [t]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const res = schema.safeParse(value);
    if (!res.success) {
      setError(res.error.issues[0]?.message ?? t('admin.support.invalidLink'));
      return;
    }
    setError(null);
    update({ [key]: res.data });
    toast.success(t('common.saved'));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          kind === 'support' ? t('admin.support.telegramTitle') : t('admin.support.communityTitle')
        }
        description={
          kind === 'support'
            ? t('admin.support.telegramSubtitle')
            : t('admin.support.communitySubtitle')
        }
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title={t('admin.support.linkLabel')}>
          <form onSubmit={save} className="flex flex-col gap-1.5">
            <label htmlFor="tg" className="type-label text-ink">
              {t('admin.support.linkLabel')}
            </label>
            <Input
              id="tg"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="https://t.me/…"
              className="h-10 text-sm"
              aria-invalid={!!error || undefined}
            />
            <p
              className={
                error ? 'type-helper text-[var(--status-danger-fg)]' : 'type-helper text-muted'
              }
            >
              {error ?? t('admin.support.linkHint')}
            </p>
            <div className="mt-3 flex gap-2">
              <Button type="submit" variant="primary">
                <Icon name="check" size={16} />
                {t('common.save')}
              </Button>
              <Button type="button" variant="outline" onClick={() => setValue('')}>
                {t('common.clear')}
              </Button>
            </div>
          </form>
          <Callout
            tone="neutral"
            compact
            className="mt-5"
            description={`NEXT_PUBLIC_TELEGRAM_${kind === 'support' ? 'SUPPORT' : 'GROUP'} · ${t('common.comingPhase2')}`}
          />
        </Panel>
        <div>
          <p className="type-overline text-muted mb-2">{t('admin.support.preview')}</p>
          <TelegramCard kind={kind} variant={kind === 'support' ? 'hero' : 'default'} showPoints />
        </div>
      </div>
    </div>
  );
}
