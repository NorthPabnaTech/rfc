'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { useI18n } from '@/i18n/provider';
import { Icon } from '@components/icon/icon';
import { EmptyState, SearchInput } from '@components/shared';
import { Button } from '@components/ui/button';
import { cn } from '@lib/utils';

import { PublicProductCard, usePublicCatalog } from '../../components/sections';

/** Public product showcase — search + category filter, never any price. */
export function ShowcaseBrowser() {
  return (
    <React.Suspense>
      <Inner />
    </React.Suspense>
  );
}

function Inner() {
  const { t, locale, num } = useI18n();
  const params = useSearchParams();
  const { products, categories } = usePublicCatalog();
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState(params.get('category') ?? 'all');

  const list = products.filter(
    (p) =>
      (category === 'all' || p.categoryId === category) &&
      (!query || `${p.name} ${p.nameBn}`.toLowerCase().includes(query.toLowerCase())),
  );
  const iconOf = (id: string) => categories.find((c) => c.id === id)?.icon ?? 'box';

  return (
    <div className="bg-hero-mesh">
      <div className="container-page py-12 sm:py-16">
        <span className="text-brand-500 text-[12.5px] font-bold tracking-[0.14em] uppercase">
          {t('site.showcase.eyebrow')}
        </span>
        <h1 className="text-ink mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t('site.showcase.pageTitle')}
        </h1>
        <p className="text-muted mt-3 max-w-2xl">{t('site.showcase.pageSubtitle')}</p>

        <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={t('seller.catalog.searchPlaceholder')}
            className="lg:w-80"
          />
          <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
            {[
              {
                id: 'all',
                name: t('seller.catalog.allCategories'),
                nameBn: t('seller.catalog.allCategories'),
              },
              ...categories,
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={cn(
                  'focus-ring h-9 shrink-0 rounded-full border px-4 text-[13px] font-semibold transition-colors',
                  category === c.id
                    ? 'bg-brand border-brand text-white'
                    : 'bg-panel border-line text-muted hover:text-ink',
                )}
              >
                {locale === 'bn' ? c.nameBn : c.name}
              </button>
            ))}
          </div>
        </div>

        <p className="text-muted mt-6 text-sm">
          {t('seller.catalog.count', { count: num(list.length) })}
        </p>
        {list.length === 0 ? (
          <EmptyState
            className="mt-4"
            title={t('common.noResults')}
            description={t('common.noResultsHint')}
          />
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {list.map((p) => (
              <PublicProductCard key={p.id} product={p} icon={iconOf(p.categoryId)} />
            ))}
          </div>
        )}

        <div className="bg-panel border-line mt-12 flex flex-col items-center gap-4 rounded-2xl border p-6 text-center sm:flex-row sm:text-left">
          <span className="bg-highlight-soft grid size-12 shrink-0 place-items-center rounded-xl text-[var(--color-sun-600)]">
            <Icon name="lock" size={22} />
          </span>
          <div className="flex-1">
            <p className="text-ink font-bold">{t('site.showcase.subtitle')}</p>
            <p className="text-muted text-sm">{t('site.cta.subtitle')}</p>
          </div>
          <Button
            asChild
            className="bg-highlight text-highlight-contrast hover:bg-highlight-hover font-semibold"
          >
            <Link href="/register">{t('site.becomeSeller')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
