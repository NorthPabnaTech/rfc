'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';

import { useI18n } from '@/i18n/provider';
import { ListToolbar } from '@components/dashboard/list-toolbar';
import { RangeFilter, type RangeValue } from '@components/dashboard/range-filter';
import { Icon } from '@components/icon/icon';
import { orderColumns } from '@components/platform/columns';
import { EmptyState, PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { DataTable } from '@components/ui/data-table';
import { Select } from '@components/ui/select';
import { Tabs } from '@components/ui/tabs';
import { useListState } from '@hooks/use-list-state';
import { inRange, resolveRange } from '@lib/business/analytics';
import { ORDER_STATUSES, PENDING_STATUSES } from '@lib/business/orders';

import { useSellerRecords } from '../components/use-seller-data';

export default function SellerOrdersPage() {
  const i18n = useI18n();
  const { t, num } = i18n;
  const router = useRouter();
  const { orders } = useSellerRecords();
  const [tab, setTab] = React.useState('all');
  const [range, setRange] = React.useState<RangeValue>({ key: 'all' });
  const r = resolveRange(range.key, range.custom);

  const rows = React.useMemo(
    () =>
      orders.filter(
        (o) =>
          (tab === 'all' ||
            (tab === 'pending' ? PENDING_STATUSES.includes(o.status) : o.status === tab)) &&
          (range.key === 'all' || inRange(o.createdAt, r)),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, tab, range],
  );
  const list = useListState({
    rows,
    search: (o) => [o.id, o.productName, o.customer.name, o.customer.phone, o.invoiceNo],
    filters: { status: (o, v) => o.status === v },
    initialFilters: { status: 'all' },
    sorters: {
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
      oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
    },
    initialSort: 'newest',
  });
  const count = (k: string) =>
    k === 'all'
      ? orders.length
      : k === 'pending'
        ? orders.filter((o) => PENDING_STATUSES.includes(o.status)).length
        : orders.filter((o) => o.status === k).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('seller.orders.title')}
        description={t('seller.orders.subtitle')}

        actions={
          <Button
            asChild
            className="bg-highlight text-highlight-contrast hover:bg-highlight-hover font-semibold"
          >
            <Link href="/seller/orders/new">
              <Icon name="plus" size={16} />
              {t('nav.placeOrder')}
            </Link>
          </Button>
        }
      />
      {orders.length === 0 ? (
        <EmptyState
          title={t('seller.orders.empty')}
          description={t('seller.orders.emptyDesc')}
          action={
            <Button variant="primary" asChild>
              <Link href="/seller/products">{t('seller.catalog.browse')}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Tabs
            variant="line"
            value={tab}
            onValueChange={(v) => {
              setTab(v);
              list.setPage(1);
            }}
            items={(
              [
                'all',
                'pending',
                'shipped',
                'out_for_delivery',
                'delivered',
                'cancelled',
                'returned',
              ] as const
            ).map((k) => ({
              value: k,
              label: (
                <span className="flex items-center gap-1.5">
                  {k === 'all'
                    ? t('common.all')
                    : k === 'pending'
                      ? t('nav.pendingOrders')
                      : t(`status.order.${k}`)}
                  <span className="bg-well text-muted num rounded-full px-1.5 text-[11px]">
                    {num(count(k))}
                  </span>
                </span>
              ),
            }))}
          />
          <ListToolbar
            query={list.query}
            onQuery={list.setQuery}
            placeholder={t('seller.orders.searchPlaceholder')}
            end={
              <Select
                size="md"
                className="w-full sm:w-40"
                value={list.sort}
                onValueChange={list.setSort}
                items={[
                  { value: 'newest', label: t('common.newest') },
                  { value: 'oldest', label: t('common.oldest') },
                ]}
                aria-label={t('common.sortBy')}
              />
            }
          >
            <Select
              size="md"
              className="sm:w-44"
              value={list.filters.status}
              onValueChange={(v) => list.setFilter('status', v)}
              items={[
                { value: 'all', label: t('seller.orders.allStatuses') },
                ...ORDER_STATUSES.map((s) => ({ value: s, label: t(`status.order.${s}`) })),
              ]}
              aria-label={t('common.status')}
            />
            <RangeFilter value={range} onChange={setRange} />
          </ListToolbar>
          <DataTable
            columns={orderColumns(i18n, { base: '/seller', showInvoice: true })}
            source={list.pageRows}
            rowKey="id"
            onRowClick={(o) => router.push(`/seller/orders/${o.id}`)}
            page={list.page}
            limit={list.limit}
            total={list.total}
            onPaginate={list.setPage}
            pageSizeOptions={[10, 20, 50]}
            onLimitChange={list.setLimit}
            empty={{ title: t('common.noResults'), description: t('common.noResultsHint') }}
          />
        </>
      )}
    </div>
  );
}
