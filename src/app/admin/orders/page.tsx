'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';

import { type TKey, useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import type { OrderStatus } from '@/types/platform';
import { ListToolbar } from '@components/dashboard/list-toolbar';
import { KpiCard } from '@components/dashboard/panel';
import { RangeFilter, type RangeValue } from '@components/dashboard/range-filter';
import { orderColumns } from '@components/platform/columns';
import { PageHeader } from '@components/shared';
import { DataTable } from '@components/ui/data-table';
import { Select } from '@components/ui/select';
import { useListState } from '@hooks/use-list-state';
import { inRange, resolveRange } from '@lib/business/analytics';
import {
  IN_TRANSIT_STATUSES,
  ORDER_STATUSES,
  orderMoney,
  PENDING_STATUSES,
} from '@lib/business/orders';

const TITLES: Record<string, TKey> = {
  all: 'nav.allOrders',
  pending: 'nav.pendingOrders',
  processing: 'nav.processing',
  shipped: 'nav.shipped',
  delivered: 'nav.delivered',
  cancelled: 'nav.cancelled',
  returned: 'nav.returned',
};

export default function AdminOrdersPage() {
  return (
    <React.Suspense>
      <OrdersList />
    </React.Suspense>
  );
}

function OrdersList() {
  const i18n = useI18n();
  const { t, num, money } = i18n;
  const router = useRouter();
  const status = useSearchParams().get('status') ?? 'all';
  const { orders, sellers } = usePlatformStore();
  const [range, setRange] = React.useState<RangeValue>({ key: 'all' });

  const matches = React.useCallback(
    (s: OrderStatus) =>
      status === 'all' ? true : status === 'pending' ? PENDING_STATUSES.includes(s) : s === status,
    [status],
  );
  const r = resolveRange(range.key, range.custom);
  const rows = React.useMemo(
    () =>
      orders.filter((o) => matches(o.status) && (range.key === 'all' || inRange(o.createdAt, r))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, matches, range],
  );
  const list = useListState({
    rows,
    search: (o) => [
      o.id,
      o.productName,
      o.customer.name,
      o.customer.phone,
      sellers.find((s) => s.id === o.sellerId)?.name,
    ],
    sorters: {
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
      oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
    },
    initialSort: 'newest',
  });

  const setStatus = (v: string) =>
    router.replace(v === 'all' ? '/admin/orders' : `/admin/orders?status=${v}`);
  const value = rows.reduce((a, o) => a + orderMoney(o).codAmount, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t(TITLES[status] ?? 'nav.allOrders')}
        description={t('admin.orders.subtitle')}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label={t('admin.dashboard.totalOrders')}
          value={num(rows.length)}
          icon="cart"
          tone="brand"
        />
        <KpiCard label={t('admin.orders.orderAmount')} value={money(value)} icon="coin" tone="ok" />
        <KpiCard
          label={t('nav.pendingOrders')}
          value={num(rows.filter((o) => PENDING_STATUSES.includes(o.status)).length)}
          icon="clock"
          tone="warn"
        />
        <KpiCard
          label={t('seller.orders.inTransit')}
          value={num(rows.filter((o) => IN_TRANSIT_STATUSES.includes(o.status)).length)}
          icon="shipping"
          tone="violet"
        />
      </div>
      <ListToolbar
        query={list.query}
        onQuery={list.setQuery}
        placeholder={t('seller.orders.searchPlaceholder')}
        end={
          <Select
            size="md"
            className="w-full sm:w-44"
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
          className="sm:w-48"
          value={status}
          onValueChange={setStatus}
          aria-label={t('common.status')}
          items={[
            { value: 'all', label: t('seller.orders.allStatuses') },
            { value: 'pending', label: t('nav.pendingOrders') },
            ...ORDER_STATUSES.map((s) => ({ value: s, label: t(`status.order.${s}`) })),
          ]}
        />
        <RangeFilter value={range} onChange={setRange} />
      </ListToolbar>
      <DataTable
        columns={orderColumns(i18n, { base: '/admin', sellers, showSeller: true })}
        source={list.pageRows}
        rowKey="id"
        onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
        page={list.page}
        limit={list.limit}
        total={list.total}
        onPaginate={list.setPage}
        pageSizeOptions={[10, 20, 50]}
        onLimitChange={list.setLimit}
        empty={{ title: t('common.noResults'), description: t('common.noResultsHint') }}
      />
    </div>
  );
}
