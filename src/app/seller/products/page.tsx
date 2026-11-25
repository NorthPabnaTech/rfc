'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { useI18n } from '@/i18n/provider';
import type { Category, SellerProduct } from '@/types/platform';
import { ListToolbar } from '@components/dashboard/list-toolbar';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { ProductImage } from '@components/platform/product-image';
import { StatusPill } from '@components/platform/status-pill';
import { EmptyState, PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { FooterBar } from '@components/ui/data-table';
import { Select } from '@components/ui/select';
import { Tabs } from '@components/ui/tabs';
import { useListState } from '@hooks/use-list-state';
import { cn } from '@lib/utils';

import { useSellerCatalog } from '../components/use-seller-data';

export default function SellerProductsPage() {
  return (
    <React.Suspense>
      <Catalog />
    </React.Suspense>
  );
}

function Catalog() {
  const { t, locale, num } = useI18n();
  const params = useSearchParams();
  const { products, categories } = useSellerCatalog();
  const [view, setView] = React.useState<'grid' | 'list'>('grid');
  const list = useListState({
    rows: products,
    search: (p) => [p.name, p.nameBn, p.id],
    filters: {
      category: (p, v) => p.categoryId === v,
      availability: (p, v) => p.availability === v,
    },
    initialFilters: { category: params.get('category') ?? 'all', availability: 'all' },
    sorters: {
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
      name: (a, b) => a.name.localeCompare(b.name),
      priceLow: (a, b) => a.basePrice - b.basePrice,
      priceHigh: (a, b) => b.basePrice - a.basePrice,
    },
    initialSort: 'newest',
    pageSize: 12,
  });
  const catOf = (id: string) => categories.find((c) => c.id === id);

  return (
    <div className="space-y-5">
      <PageHeader title={t('seller.catalog.title')} description={t('seller.catalog.subtitle')} />
      <ListToolbar
        query={list.query}
        onQuery={list.setQuery}
        placeholder={t('seller.catalog.searchPlaceholder')}
        end={
          <>
            <Select
              size="md"
              className="w-full sm:w-48"
              value={list.sort}
              onValueChange={list.setSort}
              aria-label={t('common.sortBy')}
              items={[
                { value: 'newest', label: t('common.newest') },
                { value: 'name', label: t('common.nameAZ') },
                { value: 'priceLow', label: t('common.priceLow') },
                { value: 'priceHigh', label: t('common.priceHigh') },
              ]}
            />
            <Tabs
              value={view}
              onValueChange={setView}
              size="md"
              items={[
                {
                  value: 'grid',
                  icon: 'gridView',
                  label: <span className="sr-only">{t('common.grid')}</span>,
                },
                {
                  value: 'list',
                  icon: 'list',
                  label: <span className="sr-only">{t('common.list')}</span>,
                },
              ]}
              aria-label={t('common.grid')}
            />
          </>
        }
      >
        <Select
          size="md"
          className="sm:w-52"
          value={list.filters.category}
          onValueChange={(v) => list.setFilter('category', v)}
          items={[
            { value: 'all', label: t('seller.catalog.allCategories') },
            ...categories.map((c) => ({ value: c.id, label: locale === 'bn' ? c.nameBn : c.name })),
          ]}
          aria-label={t('common.category')}
        />
        <Select
          size="md"
          className="sm:w-44"
          value={list.filters.availability}
          onValueChange={(v) => list.setFilter('availability', v)}
          items={[
            { value: 'all', label: t('admin.products.availability') },
            ...(['in_stock', 'limited', 'out_of_stock'] as const).map((a) => ({
              value: a,
              label: t(`status.availability.${a}`),
            })),
          ]}
          aria-label={t('admin.products.availability')}
        />
      </ListToolbar>

      <p className="text-muted text-sm">{t('seller.catalog.count', { count: num(list.total) })}</p>

      {list.total === 0 ? (
        <EmptyState
          title={t('common.noResults')}
          description={t('common.noResultsHint')}
          action={
            <Button variant="outline" onClick={list.resetFilters}>
              {t('common.clearFilters')}
            </Button>
          }
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {list.pageRows.map((p) => (
            <ProductCard key={p.id} product={p} category={catOf(p.categoryId)} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {list.pageRows.map((p) => (
            <ProductRow key={p.id} product={p} category={catOf(p.categoryId)} />
          ))}
        </div>
      )}
      {list.total > 0 && (
        <FooterBar
          selectedCount={0}
          className="rounded-xl2"
          pagination={{
            page: list.page,
            limit: list.limit,
            total: list.total,
            onPaginate: list.setPage,
          }}
        />
      )}
    </div>
  );
}

function ProductCard({ product: p, category }: { product: SellerProduct; category?: Category }) {
  const { t, locale } = useI18n();
  const out = p.availability === 'out_of_stock';
  return (
    <div className="bg-panel border-line group flex flex-col overflow-hidden rounded-2xl border transition-shadow hover:shadow-[0_18px_40px_-24px_rgb(2_48_71/0.45)]">
      <Link href={`/seller/products/${p.id}`} className="relative block overflow-hidden">
        <ProductImage
          src={p.images[0]}
          alt={p.name}
          icon={category?.icon}
          className={cn(
            'aspect-[4/3] w-full transition-transform duration-300 group-hover:scale-[1.03]',
            out && 'opacity-60 grayscale',
          )}
          rounded="rounded-none"
          iconSize={46}
        />
        <StatusPill
          kind="availability"
          value={p.availability}
          className="absolute top-2.5 left-2.5 shadow-sm"
        />
      </Link>
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <span className="text-subtle text-[11px] font-semibold tracking-wide uppercase">
          {locale === 'bn' ? category?.nameBn : category?.name}
        </span>
        <Link
          href={`/seller/products/${p.id}`}
          className="text-ink hover:text-accent mt-1 line-clamp-2 text-[13.5px] leading-snug font-semibold"
        >
          {locale === 'bn' ? p.nameBn : p.name}
        </Link>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <span className="text-muted block text-[11px]">{t('seller.catalog.basePrice')}</span>
            <Money value={p.basePrice} className="text-ink text-lg font-extrabold" />
          </div>
          <span className="text-right">
            <span className="text-subtle block text-[10.5px]">{t('seller.catalog.suggested')}</span>
            <Money value={p.suggestedPrice} className="text-muted text-xs font-semibold" />
          </span>
        </div>
        <div className="mt-3.5 grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/seller/products/${p.id}`}>{t('common.viewDetails')}</Link>
          </Button>
          <Button
            variant="primary"
            size="sm"
            asChild
            disabled={out}
            className={cn(out && 'pointer-events-none opacity-50')}
          >
            <Link href={`/seller/products/${p.id}#price`} aria-disabled={out}>
              {t('seller.catalog.setPrice')}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProductRow({ product: p, category }: { product: SellerProduct; category?: Category }) {
  const { t, locale } = useI18n();
  const out = p.availability === 'out_of_stock';
  return (
    <div className="bg-panel border-line flex flex-col gap-4 rounded-2xl border p-3 sm:flex-row sm:items-center">
      <ProductImage
        src={p.images[0]}
        alt={p.name}
        icon={category?.icon}
        className="aspect-[4/3] w-full shrink-0 sm:aspect-auto sm:size-20"
        rounded="rounded-xl"
        iconSize={30}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-subtle text-[11px] font-semibold uppercase">
            {locale === 'bn' ? category?.nameBn : category?.name}
          </span>
          <StatusPill kind="availability" value={p.availability} />
        </div>
        <Link
          href={`/seller/products/${p.id}`}
          className="text-ink hover:text-accent mt-1 block font-semibold"
        >
          {locale === 'bn' ? p.nameBn : p.name}
        </Link>
        <p className="text-muted mt-0.5 line-clamp-1 text-[12.5px]">{p.description}</p>
      </div>
      <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
        <div>
          <span className="text-muted block text-[11px]">{t('seller.catalog.basePrice')}</span>
          <Money value={p.basePrice} className="text-ink text-lg font-extrabold" />
        </div>
        <span className="text-subtle text-[11px]">
          {t('seller.catalog.suggested')}: <Money value={p.suggestedPrice} />
        </span>
      </div>
      <div className="flex gap-2 sm:flex-col">
        <Button
          variant="primary"
          size="sm"
          asChild
          className={cn('flex-1', out && 'pointer-events-none opacity-50')}
        >
          <Link href={`/seller/products/${p.id}#price`}>{t('seller.catalog.setPrice')}</Link>
        </Button>
        <Button variant="outline" size="sm" asChild className="flex-1">
          <Link href={`/seller/products/${p.id}`}>
            <Icon name="eye" size={14} />
            {t('common.view')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
