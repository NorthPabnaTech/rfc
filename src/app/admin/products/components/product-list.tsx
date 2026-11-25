'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import type { Product } from '@/types/platform';
import { ListToolbar } from '@components/dashboard/list-toolbar';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { ProductImage } from '@components/platform/product-image';
import { StatusPill } from '@components/platform/status-pill';
import { ConfirmDialog, PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { type Column, DataTable } from '@components/ui/data-table';
import { Dropdown } from '@components/ui/dropdown';
import { Select } from '@components/ui/select';
import { useListState } from '@hooks/use-list-state';
import { sellerBasePrice } from '@lib/business/pricing';
import { toast } from '@lib/toast';

export function ProductList() {
  const { t, locale, num, percent } = useI18n();
  const router = useRouter();
  const { products, categories, suppliers, orders, deleteProduct } = usePlatformStore();
  const [toDelete, setToDelete] = React.useState<Product | null>(null);

  const orderCount = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) m.set(o.productId, (m.get(o.productId) ?? 0) + 1);
    return m;
  }, [orders]);

  const list = useListState({
    rows: products,
    search: (p) => [p.name, p.nameBn, p.id],
    filters: {
      category: (p, v) => p.categoryId === v,
      supplier: (p, v) => p.supplierId === v,
      status: (p, v) => p.status === v,
    },
    initialFilters: { category: 'all', supplier: 'all', status: 'all' },
    sorters: {
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
      name: (a, b) => a.name.localeCompare(b.name),
      priceLow: (a, b) => sellerBasePrice(a) - sellerBasePrice(b),
      priceHigh: (a, b) => sellerBasePrice(b) - sellerBasePrice(a),
      popular: (a, b) => (orderCount.get(b.id) ?? 0) - (orderCount.get(a.id) ?? 0),
    },
    initialSort: 'newest',
  });

  const cat = (id: string) => categories.find((c) => c.id === id);
  const columns: Column<Product>[] = [
    {
      key: 'product',
      header: t('common.product'),
      minWidth: 240,
      wrap: true,
      cell: (p) => (
        <span className="flex items-center gap-3">
          <ProductImage
            src={p.images[0]}
            alt={p.name}
            icon={cat(p.categoryId)?.icon}
            className="size-11 shrink-0"
            iconSize={20}
            rounded="rounded-lg"
          />
          <span className="min-w-0">
            <span className="text-ink line-clamp-1 text-[14px] font-semibold">
              {locale === 'bn' ? p.nameBn : p.name}
            </span>
            <span className="text-subtle block text-[12.5px]">{p.id}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'category',
      header: t('common.category'),
      cell: (p) => (
        <span className="text-muted text-[14px]">
          {locale === 'bn' ? cat(p.categoryId)?.nameBn : cat(p.categoryId)?.name}
        </span>
      ),
    },
    {
      key: 'supplier',
      header: t('common.supplier'),
      cell: (p) => (
        <span className="text-muted text-[14px]">
          {suppliers.find((s) => s.id === p.supplierId)?.name}
        </span>
      ),
    },
    {
      key: 'cost',
      header: t('admin.products.supplierCost'),
      align: 'right',
      cell: (p) => <Money value={p.supplierCost} className="text-muted" />,
    },
    {
      key: 'margin',
      header: t('admin.products.margin'),
      align: 'right',
      cell: (p) => (
        <span className="leading-tight">
          <Money
            value={p.platformMargin}
            className="block font-semibold text-[var(--status-ok-fg)]"
          />
          <span className="text-subtle num text-[11px]">
            {percent((p.platformMargin / p.supplierCost) * 100)}
          </span>
        </span>
      ),
    },
    {
      key: 'base',
      header: t('admin.products.basePrice'),
      align: 'right',
      cell: (p) => <Money value={sellerBasePrice(p)} className="text-ink font-bold" />,
    },
    {
      key: 'orders',
      header: t('admin.products.ordersCount'),
      align: 'center',
      cell: (p) => <span className="num">{num(orderCount.get(p.id) ?? 0)}</span>,
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (p) => <StatusPill kind="product" value={p.status} />,
    },
    {
      key: 'actions',
      align: 'right',
      cell: (p) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Dropdown
            items={[
              {
                label: t('common.view'),
                icon: 'eye',
                onClick: () => router.push(`/admin/products/${p.id}`),
              },
              {
                label: t('common.edit'),
                icon: 'pencil',
                onClick: () => router.push(`/admin/products/${p.id}/edit`),
              },
              { type: 'separator' },
              {
                label: t('common.delete'),
                icon: 'trash',
                destructive: true,
                onClick: () => setToDelete(p),
              },
            ]}
          >
            <Button variant="ghost" size="icon-sm" aria-label={t('common.actions')}>
              <Icon name="more" size={18} />
            </Button>
          </Dropdown>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('admin.products.title')}
        description={t('admin.products.subtitle')}

        actions={
          <Button variant="primary" asChild>
            <Link href="/admin/products/new">
              <Icon name="plus" size={16} />
              {t('admin.products.add')}
            </Link>
          </Button>
        }
      />
      <ListToolbar
        query={list.query}
        onQuery={list.setQuery}
        placeholder={t('admin.products.searchPlaceholder')}
        end={
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
              { value: 'popular', label: t('common.popular') },
            ]}
          />
        }
      >
        <Select
          size="md"
          className="sm:w-48"
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
          className="sm:w-48"
          value={list.filters.supplier}
          onValueChange={(v) => list.setFilter('supplier', v)}
          items={[
            { value: 'all', label: t('admin.products.allSuppliers') },
            ...suppliers.map((s) => ({ value: s.id, label: s.name })),
          ]}
          aria-label={t('common.supplier')}
        />
        <Select
          size="md"
          className="sm:w-40"
          value={list.filters.status}
          onValueChange={(v) => list.setFilter('status', v)}
          items={[
            { value: 'all', label: t('admin.products.allStatuses') },
            ...(['active', 'draft', 'out_of_stock'] as const).map((s) => ({
              value: s,
              label: t(`status.product.${s}`),
            })),
          ]}
          aria-label={t('common.status')}
        />
      </ListToolbar>
      <DataTable
        columns={columns}
        source={list.pageRows}
        rowKey="id"
        onRowClick={(p) => router.push(`/admin/products/${p.id}`)}
        page={list.page}
        limit={list.limit}
        total={list.total}
        onPaginate={list.setPage}
        pageSizeOptions={[10, 20, 50]}
        onLimitChange={list.setLimit}
        empty={{ title: t('common.noResults'), description: t('common.noResultsHint') }}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        tone="danger"
        destructive
        icon="trash"
        title={t('admin.products.deleteTitle')}
        description={t('admin.products.deleteDesc', { name: toDelete?.name ?? '' })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          if (toDelete) deleteProduct(toDelete.id);
          toast.success(t('common.deleted'));
          setToDelete(null);
        }}
      />
    </div>
  );
}
