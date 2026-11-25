'use client';

import * as React from 'react';
import Link from 'next/link';

import { deriveCategories, mapResellerProduct } from '@/app/seller/components/use-seller-data';
import { type TKey, useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { ProductImage } from '@components/platform/product-image';
import { StatusPill } from '@components/platform/status-pill';
import { TelegramCard } from '@components/platform/telegram-card';
import { Button } from '@components/ui/button';
import { useHydrated } from '@hooks/use-hydrated';
import { resellerApi, type ResellerProduct } from '@lib/api/reseller';
import { cn } from '@lib/utils';

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  light,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
  light?: boolean;
}) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      <span
        className={cn(
          'text-[12.5px] font-bold tracking-[0.14em] uppercase',
          light ? 'text-brand-200' : 'text-brand-500',
        )}
      >
        {eyebrow}
      </span>
      <h2
        className={cn(
          'mt-3 text-[1.75rem] leading-tight font-extrabold tracking-tight sm:text-4xl',
          light ? 'text-white' : 'text-ink',
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={cn('mt-4 text-base leading-relaxed', light ? 'text-noir-fg' : 'text-muted')}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

/**
 * Public catalog — fetched unauthenticated (`skipAuth: true`) so prices are
 * never returned by the API (`authenticated: false`).
 */
export function usePublicCatalog() {
  const [raw, setRaw] = React.useState<ResellerProduct[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    resellerApi
      .listProducts({ page: 1, limit: 50 }, { skipAuth: true })
      .then((res) => {
        if (active) setRaw(res.data.items);
      })
      .catch(() => {
        if (active) setRaw([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const products = React.useMemo(() => raw.map(mapResellerProduct), [raw]);
  const categories = React.useMemo(() => deriveCategories(raw), [raw]);

  return { products, categories, loading };
}

export function HowItWorks() {
  const { t, num } = useI18n();
  const steps: [IconRegistryKey, TKey, TKey][] = [
    ['userAdd', 'site.steps.s1', 'site.steps.s1d'],
    ['box', 'site.steps.s2', 'site.steps.s2d'],
    ['saleTag', 'site.steps.s3', 'site.steps.s3d'],
    ['moneyBag', 'site.steps.s4', 'site.steps.s4d'],
  ];
  return (
    <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow={t('site.steps.eyebrow')}
          title={t('site.steps.title')}
          subtitle={t('site.steps.subtitle')}
        />
        <ol className="relative mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div
            className="border-brand-200 absolute top-[38px] right-[12%] left-[12%] hidden border-t-2 border-dashed lg:block dark:border-white/10"
            aria-hidden
          />
          {steps.map(([icon, title, desc], i) => (
            <li
              key={title}
              className="bg-panel border-line relative rounded-2xl border p-6 text-center shadow-[0_1px_2px_rgb(2_48_71/0.04)]"
            >
              <span className="from-brand-400 to-brand-600 relative mx-auto grid size-[60px] place-items-center rounded-2xl bg-gradient-to-br text-white shadow-[0_12px_24px_-12px_var(--color-brand-500)]">
                <Icon name={icon} size={26} />
                <span className="bg-highlight text-highlight-contrast num absolute -top-2 -right-2 grid size-6 place-items-center rounded-full text-xs font-bold ring-4 ring-[var(--color-panel)]">
                  {num(i + 1)}
                </span>
              </span>
              <h3 className="text-ink mt-5 text-base font-bold">{t(title)}</h3>
              <p className="text-muted mt-2 text-sm leading-relaxed">{t(desc)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Features() {
  const { t } = useI18n();
  const items: [IconRegistryKey, TKey, TKey][] = [
    ['packageOpen', 'site.features.f1', 'site.features.f1d'],
    ['box', 'site.features.f2', 'site.features.f2d'],
    ['saleTag', 'site.features.f3', 'site.features.f3d'],
    ['cart', 'site.features.f4', 'site.features.f4d'],
    ['shipping', 'site.features.f5', 'site.features.f5d'],
    ['receipt', 'site.features.f6', 'site.features.f6d'],
    ['wallet', 'site.features.f7', 'site.features.f7d'],
    ['moneyBag', 'site.features.f8', 'site.features.f8d'],
  ];
  return (
    <section id="features" className="bg-panel border-line scroll-mt-20 border-y py-20 sm:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow={t('site.features.eyebrow')}
          title={t('site.features.title')}
          subtitle={t('site.features.subtitle')}
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(([icon, title, desc], i) => (
            <div
              key={title}
              className="group border-line bg-surface hover:border-brand-200 dark:hover:border-brand-700 relative rounded-2xl border p-6 transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgb(2_48_71/0.4)]"
            >
              <span
                className={cn(
                  'grid size-12 place-items-center rounded-xl',
                  i % 3 === 1
                    ? 'bg-highlight-soft text-[var(--color-sun-600)] dark:text-[var(--color-sun-300)]'
                    : 'bg-brand-soft text-brand-ink',
                )}
              >
                <Icon name={icon} size={23} />
              </span>
              <h3 className="text-ink mt-5 text-[15px] font-bold">{t(title)}</h3>
              <p className="text-muted mt-2 text-sm leading-relaxed">{t(desc)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function EarningsExplainer() {
  const { t, money } = useI18n();
  const base = 550;
  const selling = 700;
  const profit = selling - base;
  return (
    <section className="bg-noir-glow relative overflow-hidden py-20 sm:py-24">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2">
        <SectionHeading
          align="left"
          light
          eyebrow={t('site.earnings.eyebrow')}
          title={t('site.earnings.title')}
          subtitle={t('site.earnings.subtitle')}
        />
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur sm:p-8">
          <div className="space-y-5">
            <Bar
              label={t('site.earnings.base')}
              value={money(base)}
              pct={(base / selling) * 100}
              color="#8ecae6"
            />
            <Bar
              label={t('site.earnings.selling')}
              value={money(selling)}
              pct={100}
              color="#219ebc"
            />
          </div>
          <div className="mt-7 flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#fb8500] to-[#ffb703] p-5 text-[#023047]">
            <div>
              <div className="text-sm font-semibold opacity-80">{t('site.earnings.profit')}</div>
              <div className="num text-3xl font-extrabold">{money(profit)}</div>
            </div>
            <Icon name="trend" size={40} className="opacity-80" />
          </div>
          <p className="mt-5 text-center text-sm font-semibold text-white">
            {t('site.earnings.formula')}
          </p>
          <p className="text-noir-fg mt-1.5 text-center text-xs">{t('site.earnings.note')}</p>
        </div>
      </div>
    </section>
  );
}

function Bar({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-noir-fg font-medium">{label}</span>
        <span className="num font-bold text-white">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function Benefits() {
  const { t } = useI18n();
  const items: [IconRegistryKey, TKey, TKey][] = [
    ['coin', 'site.benefits.b1', 'site.benefits.b1d'],
    ['eye', 'site.benefits.b2', 'site.benefits.b2d'],
    ['earth', 'site.benefits.b3', 'site.benefits.b3d'],
    ['support', 'site.benefits.b4', 'site.benefits.b4d'],
  ];
  return (
    <section className="py-20 sm:py-24">
      <div className="container-page grid items-start gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="lg:sticky lg:top-28">
          <SectionHeading
            align="left"
            eyebrow={t('site.benefits.eyebrow')}
            title={t('site.benefits.title')}
          />
          <Button size="lg" variant="primary" asChild className="mt-8">
            <Link href="/register">
              {t('site.hero.primary')}
              <Icon name="chevRight" size={16} />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map(([icon, title, desc]) => (
            <div key={title} className="bg-panel border-line rounded-2xl border p-6">
              <Icon name={icon} size={26} className="text-brand-500" />
              <h3 className="text-ink mt-4 text-base font-bold">{t(title)}</h3>
              <p className="text-muted mt-2 text-sm leading-relaxed">{t(desc)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CategoriesGrid() {
  const { t, locale, num } = useI18n();
  const { products, categories } = usePublicCatalog();
  return (
    <section className="bg-panel border-line border-y py-20 sm:py-24">
      <div className="container-page">
        <SectionHeading eyebrow={t('site.categories.eyebrow')} title={t('site.categories.title')} />
        <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {categories.map((c, i) => (
            <Link
              key={c.id}
              href={`/products?category=${c.id}`}
              className="group border-line bg-surface hover:border-brand-200 focus-ring dark:hover:border-brand-700 flex flex-col items-start gap-4 rounded-2xl border p-5 transition-colors"
            >
              <ProductImage
                src={`art:${i}`}
                alt=""
                icon={c.icon}
                className="size-12"
                iconSize={22}
                rounded="rounded-xl"
              />
              <div>
                <h3 className="text-ink text-sm font-bold sm:text-[15px]">
                  {locale === 'bn' ? c.nameBn : c.name}
                </h3>
                <p className="text-muted mt-0.5 text-xs">
                  {t('site.categories.products', {
                    count: num(products.filter((p) => p.categoryId === c.id).length),
                  })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PublicProductCard({
  product,
  icon,
}: {
  product: ReturnType<typeof mapResellerProduct>;
  icon: string;
}) {
  const { t, locale } = useI18n();
  return (
    <div className="bg-panel border-line group flex flex-col overflow-hidden rounded-2xl border">
      <Link href={`/products/${product.slug}`} className="block overflow-hidden">
        <ProductImage
          src={product.images[0]}
          alt={product.name}
          icon={icon}
          className="aspect-[4/3] w-full transition-transform duration-300 group-hover:scale-[1.03]"
          rounded="rounded-none"
          iconSize={48}
        />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Link
          href={`/products/${product.slug}`}
          className="text-ink hover:text-accent line-clamp-2 text-sm font-semibold"
        >
          {locale === 'bn' ? product.nameBn : product.name}
        </Link>
        <div className="mt-auto flex items-center justify-between gap-2">
          <StatusPill kind="availability" value={product.availability} />
        </div>
        <Link
          href="/login"
          className="bg-well text-muted hover:text-ink focus-ring flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold"
        >
          <Icon name="lock" size={14} />
          {t('site.showcase.priceLocked')}
        </Link>
      </div>
    </div>
  );
}

export function Showcase() {
  const { t } = useI18n();
  const { products, categories } = usePublicCatalog();
  const iconOf = (id: string) => categories.find((c) => c.id === id)?.icon ?? 'box';
  return (
    <section className="py-20 sm:py-24">
      <div className="container-page">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            align="left"
            eyebrow={t('site.showcase.eyebrow')}
            title={t('site.showcase.title')}
            subtitle={t('site.showcase.subtitle')}
          />
          <Button variant="secondary" asChild>
            <Link href="/products">
              {t('site.showcase.viewAll')}
              <Icon name="chevRight" size={16} />
            </Link>
          </Button>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.slice(0, 8).map((p) => (
            <PublicProductCard key={p.id} product={p} icon={iconOf(p.categoryId)} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function WalletFlow() {
  const { t, money, num } = useI18n();
  const settings = usePlatformStore((s) => s.settings);
  const mounted = useHydrated();
  // Defaults until mounted (server markup must match the first client render).
  const s = mounted
    ? settings
    : {
        minAddBalance: 100,
        minWithdrawal: 50,
        withdrawalFees: { threshold: 1000, lowFee: 5, highFee: 10 },
      };
  const steps: [IconRegistryKey, string, string][] = [
    [
      'moneyAdd',
      t('site.walletFlow.w1'),
      t('site.walletFlow.w1d', { min: money(s.minAddBalance) }),
    ],
    ['receipt', t('site.walletFlow.w2'), t('site.walletFlow.w2d')],
    ['clock', t('site.walletFlow.w3'), t('site.walletFlow.w3d')],
    [
      'moneySend',
      t('site.walletFlow.w4'),
      t('site.walletFlow.w4d', {
        min: money(s.minWithdrawal),
        low: money(s.withdrawalFees.lowFee),
        high: money(s.withdrawalFees.highFee),
        threshold: money(s.withdrawalFees.threshold),
      }),
    ],
  ];
  return (
    <section className="bg-panel border-line border-y py-20 sm:py-24">
      <div className="container-page">
        <SectionHeading eyebrow={t('site.walletFlow.eyebrow')} title={t('site.walletFlow.title')} />
        <div className="mt-12 grid gap-4 md:grid-cols-4">
          {steps.map(([icon, title, desc], i) => (
            <div key={title} className="relative">
              <div className="border-line bg-surface h-full rounded-2xl border p-6">
                <div className="flex items-center justify-between">
                  <span className="bg-brand-soft text-brand-ink grid size-11 place-items-center rounded-xl">
                    <Icon name={icon} size={21} />
                  </span>
                  <span className="text-line-2 num text-3xl font-black">{num(i + 1)}</span>
                </div>
                <h3 className="text-ink mt-5 font-bold">{title}</h3>
                <p className="text-muted mt-2 text-sm leading-relaxed">{desc}</p>
              </div>
              {i < steps.length - 1 && (
                <Icon
                  name="chevRight"
                  size={20}
                  className="text-brand-300 absolute top-1/2 -right-3.5 z-10 hidden -translate-y-1/2 md:block"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  const { t } = useI18n();
  const items = [1, 2, 3, 4, 5, 6] as const;
  return (
    <section id="faq" className="scroll-mt-20 py-20 sm:py-24">
      <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <SectionHeading align="left" eyebrow={t('site.faq.eyebrow')} title={t('site.faq.title')} />
        <div className="space-y-3">
          {items.map((n) => (
            <details
              key={n}
              className="group bg-panel border-line rounded-2xl border px-5 py-1 open:shadow-[0_12px_30px_-20px_rgb(2_48_71/0.35)]"
              open={n === 1}
            >
              <summary className="text-ink flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                {t(`site.faq.q${n}`)}
                <span className="bg-well text-muted grid size-7 shrink-0 place-items-center rounded-full transition-transform group-open:rotate-45">
                  <Icon name="plus" size={15} />
                </span>
              </summary>
              <p className="text-muted pb-5 text-sm leading-relaxed">{t(`site.faq.a${n}`)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Cta() {
  const { t } = useI18n();
  return (
    <section className="pb-20 sm:pb-24">
      <div className="container-page">
        <div className="bg-noir-glow relative overflow-hidden rounded-[2rem] px-6 py-14 text-center sm:px-12 sm:py-16">
          <div
            className="absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-[#fb8500]/20 blur-3xl"
            aria-hidden
          />
          <h2 className="relative mx-auto max-w-2xl text-[1.75rem] leading-tight font-extrabold text-white sm:text-4xl">
            {t('site.cta.title')}
          </h2>
          <p className="text-noir-fg relative mx-auto mt-4 max-w-xl">{t('site.cta.subtitle')}</p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              size="xl"
              asChild
              className="bg-highlight text-highlight-contrast hover:bg-highlight-hover font-bold"
            >
              <Link href="/register">{t('site.cta.primary')}</Link>
            </Button>
            <Button
              size="xl"
              asChild
              className="border border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              <Link href="/#contact">{t('site.cta.secondary')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Contact() {
  const { t } = useI18n();
  const email = usePlatformStore((s) => s.settings.contactEmail);
  const mounted = useHydrated();
  return (
    <section id="contact" className="bg-panel border-line scroll-mt-20 border-t py-20 sm:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow={t('site.contact.eyebrow')}
          title={t('site.contact.title')}
          subtitle={t('site.contact.subtitle')}
        />
        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
          <TelegramCard kind="support" variant="hero" showPoints />
          <TelegramCard kind="group" showPoints />
        </div>
        {mounted && email && (
          <p className="text-muted mt-8 text-center text-sm">
            {t('site.contact.emailUs')}:{' '}
            <a href={`mailto:${email}`} className="text-accent font-semibold hover:underline">
              {email}
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
