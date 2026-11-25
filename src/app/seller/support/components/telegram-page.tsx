'use client';

import { useI18n } from '@/i18n/provider';
import { Panel } from '@components/dashboard/panel';
import { Icon } from '@components/icon/icon';
import { TelegramCard, useTelegramLinks } from '@components/platform/telegram-card';
import { Callout, PageHeader } from '@components/shared';

/** Seller-facing Telegram support / community page. */
export function TelegramPage({ kind }: { kind: 'support' | 'group' }) {
  const { t } = useI18n();
  const links = useTelegramLinks();
  const href = kind === 'support' ? links.support : links.group;
  const steps =
    kind === 'support'
      ? [
          t('seller.support.supportPoints').split('|')[0]!,
          t('seller.support.hours'),
          t('site.contact.supportDesc'),
        ]
      : t('seller.support.communityPoints').split('|');
  return (
    <div className="space-y-5">
      <PageHeader
        title={
          kind === 'support'
            ? t('seller.support.telegramTitle')
            : t('seller.support.communityTitle')
        }
        description={
          kind === 'support'
            ? t('seller.support.telegramSubtitle')
            : t('seller.support.communitySubtitle')
        }
      />
      {!href && (
        <Callout
          tone="warn"
          title={t('common.notConfigured')}
          description={t('seller.support.notConfiguredDesc')}
        />
      )}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <TelegramCard kind={kind} variant="hero" showPoints className="sm:p-8" />
        <Panel title={t('seller.support.quickHelp')}>
          <ul className="space-y-3">
            {steps.map((s) => (
              <li key={s} className="flex gap-3 text-[13px]">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#229ED9]/12 text-[#229ED9]">
                  <Icon name="check" size={14} />
                </span>
                <span className="text-ink pt-1">{s}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
