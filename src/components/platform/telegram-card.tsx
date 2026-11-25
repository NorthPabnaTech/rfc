'use client';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { PLATFORM } from '@config/platform';
import { useHydrated } from '@hooks/use-hydrated';
import { cn } from '@lib/utils';

/**
 * Telegram links: admin settings (Phase 1: browser store) override the
 * NEXT_PUBLIC_TELEGRAM_* env placeholders. Never a hard-coded/fake link —
 * an empty value renders a "not configured yet" state.
 * Returns env values until mounted so server and client markup match.
 */
export function useTelegramLinks() {
  const settings = usePlatformStore((s) => s.settings);
  const mounted = useHydrated();
  return mounted
    ? { support: settings.telegramSupport, group: settings.telegramGroup }
    : { support: PLATFORM.telegram.support, group: PLATFORM.telegram.group };
}

type Kind = 'support' | 'group';

export function TelegramCard({
  kind,
  variant = 'default',
  className,
  showPoints = false,
}: {
  kind: Kind;
  variant?: 'default' | 'noir' | 'hero';
  className?: string;
  showPoints?: boolean;
}) {
  const { t } = useI18n();
  const links = useTelegramLinks();
  const href = kind === 'support' ? links.support : links.group;
  const title = kind === 'support' ? t('site.contact.supportTitle') : t('site.contact.groupTitle');
  const desc = kind === 'support' ? t('site.contact.supportDesc') : t('site.contact.groupDesc');
  const cta = kind === 'support' ? t('site.contact.contactSupport') : t('site.contact.joinGroup');
  const points = (
    kind === 'support' ? t('seller.support.supportPoints') : t('seller.support.communityPoints')
  ).split('|');
  const noir = variant === 'noir';
  const hero = variant === 'hero';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border p-5 sm:p-6',
        noir && 'border-white/10 bg-white/[0.04] text-white',
        variant === 'default' && 'bg-panel border-line',
        hero && 'border-transparent bg-gradient-to-br from-[#229ED9] to-[#136780] text-white',
        className,
      )}
    >
      {hero && (
        <span
          className="absolute -top-16 -right-16 size-48 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
      )}
      <div className="relative flex items-start gap-4">
        <span
          className={cn(
            'grid size-12 shrink-0 place-items-center rounded-2xl',
            hero ? 'bg-white/15 text-white' : 'bg-[#229ED9]/12 text-[#229ED9]',
          )}
        >
          <Icon name={kind === 'support' ? 'telegram' : 'users'} size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={cn('type-card-title text-[15px]', !noir && !hero && 'text-ink')}>
            {title}
          </h3>
          <p
            className={cn(
              'type-helper mt-1',
              noir ? 'text-noir-fg' : hero ? 'text-white/80' : 'text-muted',
            )}
          >
            {desc}
          </p>
        </div>
      </div>
      {showPoints && (
        <ul className="relative mt-5 space-y-2.5">
          {points.map((p) => (
            <li
              key={p}
              className={cn(
                'flex items-center gap-2.5 text-[13px]',
                hero ? 'text-white/90' : 'text-ink',
              )}
            >
              <Icon
                name="checkCircle"
                size={17}
                className={hero ? 'text-[#ffb703]' : 'text-[#229ED9]'}
              />
              {p}
            </li>
          ))}
        </ul>
      )}
      <div className="relative mt-5">
        {href ? (
          <Button
            asChild
            className={cn(
              'w-full sm:w-auto',
              hero
                ? 'bg-[#ffffff] text-[#136780] hover:bg-[#ffffff]/90'
                : 'bg-[#229ED9] text-white hover:bg-[#1c8cc2]',
            )}
          >
            <a href={href} target="_blank" rel="noopener noreferrer">
              <Icon name="telegram" size={16} />
              {cta}
              <Icon name="external" size={14} />
            </a>
          </Button>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Button
              disabled
              variant={hero || noir ? 'secondary' : 'outline'}
              className="w-full sm:w-auto"
            >
              <Icon name="telegram" size={16} />
              {cta}
            </Button>
            <span
              className={cn(
                'type-caption',
                hero ? 'text-white/75' : noir ? 'text-noir-fg' : 'text-subtle',
              )}
            >
              {t('common.notConfigured')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
