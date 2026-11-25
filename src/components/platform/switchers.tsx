'use client';

import { useTheme } from 'next-themes';

import { LOCALE_LABELS, LOCALES } from '@/i18n/config';
import { useI18n } from '@/i18n/provider';
import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { Dropdown } from '@components/ui/dropdown';
import { useHydrated } from '@hooks/use-hydrated';
import { cn } from '@lib/utils';

const THEMES: { value: 'light' | 'dark' | 'system'; icon: IconRegistryKey }[] = [
  { value: 'light', icon: 'sun' },
  { value: 'dark', icon: 'moon' },
  { value: 'system', icon: 'monitor' },
];

/** Light / Dark / System dropdown (top navigation). */
export function ThemeSwitcher({ className, onNoir }: { className?: string; onNoir?: boolean }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { t } = useI18n();
  const mounted = useHydrated();
  const icon: IconRegistryKey = !mounted ? 'sun' : resolvedTheme === 'dark' ? 'moon' : 'sun';
  return (
    <Dropdown
      align="end"
      items={THEMES.map((o) => ({
        label: t(`common.${o.value}`),
        icon: o.icon,
        onClick: () => setTheme(o.value),
        className: mounted && theme === o.value ? 'text-accent font-semibold' : undefined,
      }))}
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('common.theme')}
        className={cn(onNoir && 'text-white hover:bg-white/10', className)}
      >
        <Icon name={icon} size={18} />
      </Button>
    </Dropdown>
  );
}

/** Segmented Light / Dark / System cards (Settings pages). */
export function ThemeCards() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const mounted = useHydrated();
  const desc = {
    light: t('admin.settings.lightDesc'),
    dark: t('admin.settings.darkDesc'),
    system: t('admin.settings.systemDesc'),
  };
  return (
    <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label={t('common.theme')}>
      {THEMES.map((o) => {
        const active = mounted && theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(o.value)}
            className={cn(
              'focus-ring bg-panel rounded-xl border p-3 text-left transition-colors',
              active ? 'border-brand ring-brand ring-1' : 'border-line hover:border-line-2',
            )}
          >
            <ThemePreview kind={o.value} />
            <div className="mt-3 flex items-center gap-2">
              <Icon name={o.icon} size={16} className={active ? 'text-accent' : 'text-muted'} />
              <span className="type-label text-ink">{t(`common.${o.value}`)}</span>
              {active && <Icon name="checkCircle" size={16} className="text-accent ml-auto" />}
            </div>
            <p className="type-helper text-muted mt-1">{desc[o.value]}</p>
          </button>
        );
      })}
    </div>
  );
}

function ThemePreview({ kind }: { kind: 'light' | 'dark' | 'system' }) {
  const pane = (dark: boolean) => (
    <div className={cn('flex h-full flex-1 gap-1.5 p-1.5', dark ? 'bg-[#011a28]' : 'bg-[#f2fafd]')}>
      <div className="w-1/4 rounded bg-[#023047]" />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className={cn('h-2 w-2/3 rounded', dark ? 'bg-[#063149]' : 'bg-[#ffffff]')} />
        <div className={cn('flex-1 rounded', dark ? 'bg-[#03253a]' : 'bg-[#ffffff]')}>
          <div className="m-1.5 h-1.5 w-1/2 rounded bg-[#219ebc]" />
          <div className="m-1.5 h-1.5 w-1/3 rounded bg-[#fb8500]" />
        </div>
      </div>
    </div>
  );
  return (
    <div className="border-line flex h-20 overflow-hidden rounded-lg border">
      {kind === 'system' ? (
        <>
          {pane(false)}
          {pane(true)}
        </>
      ) : (
        pane(kind === 'dark')
      )}
    </div>
  );
}

/** EN / বাং toggle (top navigation). */
export function LanguageSwitcher({ className, onNoir }: { className?: string; onNoir?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <Dropdown
      align="end"
      items={LOCALES.map((l) => ({
        label: LOCALE_LABELS[l],
        onClick: () => setLocale(l),
        className: locale === l ? 'text-accent font-semibold' : undefined,
      }))}
    >
      <Button
        variant="ghost"
        size="md"
        aria-label={t('common.language')}
        className={cn('gap-1.5 px-2.5', onNoir && 'text-white hover:bg-white/10', className)}
      >
        <Icon name="globe" size={17} />
        <span className="text-[12.5px] font-semibold">{locale === 'bn' ? 'বাং' : 'EN'}</span>
      </Button>
    </Dropdown>
  );
}

/** Large language cards (Settings pages). */
export function LanguageCards() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t('common.language')}>
      {LOCALES.map((l) => {
        const active = locale === l;
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setLocale(l)}
            className={cn(
              'focus-ring bg-panel flex items-center gap-4 rounded-xl border p-4 text-left transition-colors',
              active ? 'border-brand ring-brand ring-1' : 'border-line hover:border-line-2',
            )}
          >
            <span className="bg-brand-soft text-brand-ink grid size-12 place-items-center rounded-xl text-lg font-bold">
              {l === 'bn' ? 'অ' : 'Aa'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="type-card-title text-ink block">{LOCALE_LABELS[l]}</span>
              <span className="type-helper text-muted block">
                {l === 'bn' ? 'হিন্দ শিলিগুড়ি · ০১২৩৪৫৬৭৮৯' : 'Inter · 0123456789'}
              </span>
            </span>
            {active && <Icon name="checkCircle" size={20} className="text-accent" />}
          </button>
        );
      })}
    </div>
  );
}
