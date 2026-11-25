'use client';

import Link from 'next/link';

import { useI18n } from '@/i18n/provider';
import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { Button } from '@components/ui/button';

export function Hero() {
  const { t } = useI18n();
  const points: [IconRegistryKey, string][] = [
    ['packageOpen', t('site.hero.point1')],
    ['saleTag', t('site.hero.point2')],
    ['shipping', t('site.hero.point3')],
  ];
  return (
    <section className="bg-hero-mesh relative overflow-hidden">
      <div className="bg-dot-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_0%,#000,transparent)] opacity-60" />
      <div className="container-page relative grid items-center gap-12 pt-10 pb-16 sm:pt-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10 lg:pt-20 lg:pb-24">
        <div className="animate-fade-up">
          <span className="border-brand-200 bg-panel/70 text-brand-ink inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12.5px] font-semibold backdrop-blur dark:border-white/10">
            <span className="bg-highlight size-1.5 rounded-full" />
            {t('site.hero.badge')}
          </span>
          <h1 className="text-ink mt-5 text-[2.1rem] leading-[1.12] font-extrabold tracking-tight sm:text-5xl lg:text-[3.35rem]">
            {t('site.hero.title')}
          </h1>
          <p className="text-muted mt-5 max-w-xl text-base leading-relaxed sm:text-lg">
            {t('site.hero.subtitle')}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              size="xl"
              asChild
              className="bg-highlight text-highlight-contrast hover:bg-highlight-hover font-bold shadow-[0_10px_30px_-10px_rgb(251_133_0/0.6)]"
            >
              <Link href="/register">
                {t('site.hero.primary')}
                <Icon name="chevRight" size={18} />
              </Link>
            </Button>
            <Button size="xl" variant="secondary" asChild>
              <Link href="/#how-it-works">
                <Icon name="pulse" size={18} />
                {t('site.hero.secondary')}
              </Link>
            </Button>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            {points.map(([icon, label]) => (
              <li key={label} className="text-ink flex items-center gap-2 text-sm font-medium">
                <span className="bg-brand-soft text-brand-ink grid size-7 place-items-center rounded-lg">
                  <Icon name={icon} size={15} />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

/** Illustrative dashboard mock — sample figures only, not business statistics. */
function HeroVisual() {
  const { t, money } = useI18n();
  const bars = [38, 52, 44, 66, 58, 74, 62, 88, 70, 92, 80, 100];
  return (
    <div
      className="animate-fade-up relative mx-auto w-full max-w-[540px] [animation-delay:120ms]"
      aria-hidden
    >
      <div className="bg-brand-200/40 dark:bg-brand-700/20 absolute -inset-6 rounded-[2.5rem] blur-3xl" />
      <div className="bg-panel border-line relative overflow-hidden rounded-3xl border shadow-[0_30px_80px_-30px_rgb(2_48_71/0.45)]">
        <div className="bg-noir flex items-center gap-2 px-4 py-3">
          <span className="size-2.5 rounded-full bg-[#fb8500]" />
          <span className="size-2.5 rounded-full bg-[#ffb703]" />
          <span className="size-2.5 rounded-full bg-[#8ecae6]" />
          <span className="text-noir-fg ml-2 text-xs font-semibold">{t('site.mock.title')}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <div className="from-brand-500 to-brand-700 rounded-2xl bg-gradient-to-br p-4 text-white">
            <div className="flex items-center gap-2 text-xs text-white/80">
              <Icon name="wallet" size={15} />
              {t('site.mock.available')}
            </div>
            <div className="num mt-2 text-2xl font-extrabold">{money(4850)}</div>
          </div>
          <div className="bg-well rounded-2xl p-4">
            <div className="text-muted flex items-center gap-2 text-xs">
              <Icon name="clock" size={15} />
              {t('site.mock.pending')}
            </div>
            <div className="num text-ink mt-2 text-2xl font-extrabold">{money(1320)}</div>
          </div>
          <div className="bg-well col-span-2 rounded-2xl p-4">
            <div className="flex h-24 items-end gap-1.5">
              {bars.map((h, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-t-[4px]"
                  style={{
                    height: `${h}%`,
                    background:
                      i === bars.length - 1 ? 'var(--color-highlight)' : 'var(--color-brand-500)',
                    opacity: i === bars.length - 1 ? 1 : 0.35 + i * 0.05,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-panel border-line absolute -bottom-6 -left-2 flex items-center gap-3 rounded-2xl border p-3 pr-5 shadow-[0_18px_40px_-18px_rgb(2_48_71/0.5)] sm:-left-8">
        <span className="bg-highlight-soft grid size-10 place-items-center rounded-xl text-[var(--color-sun-600)]">
          <Icon name="cart" size={20} />
        </span>
        <div>
          <div className="text-ink text-[13px] font-bold">{t('site.mock.newOrder')}</div>
          <div className="text-muted text-xs">
            {t('site.mock.profit')}:{' '}
            <span className="num font-bold text-[var(--status-ok-fg)]">
              {money(150, { signed: true })}
            </span>
          </div>
        </div>
      </div>
      <div className="bg-panel border-line absolute -top-5 -right-1 flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 shadow-[0_18px_40px_-18px_rgb(2_48_71/0.5)] sm:-right-6">
        <span className="grid size-8 place-items-center rounded-full bg-[var(--status-ok-bg)] text-[var(--status-ok-fg)]">
          <Icon name="delivered" size={17} />
        </span>
        <span className="text-ink text-[13px] font-semibold">{t('site.mock.delivered')}</span>
      </div>
    </div>
  );
}
