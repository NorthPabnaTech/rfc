'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import type { Seller } from '@/types/platform';
import { ListToolbar } from '@components/dashboard/list-toolbar';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { StatusPill } from '@components/platform/status-pill';
import { UserAvatar } from '@components/platform/user-avatar';
import { PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { type Column, DataTable } from '@components/ui/data-table';
import { Dropdown } from '@components/ui/dropdown';
import { Tabs } from '@components/ui/tabs';
import { useListState } from '@hooks/use-list-state';
import { computeWallet } from '@lib/business/wallet';

import {
  type SellerAction,
  SellerStatusConfirm,
  useSellerActions,
} from './components/seller-actions';

type Row = Seller & { orders: number; earnings: number; available: number };

export default function AdminSellersPage() {
  return (
    <React.Suspense>
      <SellersList />
    </React.Suspense>
  );
}

function SellersList() {
  const { t, num, date } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const status = params.get('status') ?? 'all';
  const { sellers, orders, transactions, earnings, withdrawals } = usePlatformStore();
  const actionsFor = useSellerActions();
  const [pending, setPending] = React.useState<{ seller: Seller; action: SellerAction } | null>(
    null,
  );

  const rows = React.useMemo<Row[]>(
    () =>
      sellers.map((s) => {
        const w = computeWallet(s.id, transactions, earnings, withdrawals);
        return {
          ...s,
          orders: orders.filter((o) => o.sellerId === s.id).length,
          earnings: w.totalEarnings,
          available: w.available,
        };
      }),
    [sellers, orders, transactions, earnings, withdrawals],
  );

  const list = useListState({
    rows: status === 'all' ? rows : rows.filter((r) => r.status === status),
    search: (s) => [s.name, s.shopName, s.email, s.phone],
    sorters: {
      newest: (a, b) => b.joinedAt.localeCompare(a.joinedAt),
      orders: (a, b) => b.orders - a.orders,
      earnings: (a, b) => b.earnings - a.earnings,
    },
    initialSort: 'newest',
  });

  const setStatus = (v: string) =>
    router.replace(v === 'all' ? '/admin/sellers' : `/admin/sellers?status=${v}`);
  const title =
    status === 'active'
      ? t('admin.sellers.activeTitle')
      : status === 'pending'
        ? t('admin.sellers.pendingTitle')
        : t('admin.sellers.title');
  const counts = (s: string) =>
    s === 'all' ? rows.length : rows.filter((r) => r.status === s).length;

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: t('common.seller'),
      minWidth: 200,
      cell: (s) => (
        <span className="flex items-center gap-3">
          <UserAvatar name={s.name} color={s.avatarColor} size={36} />
          <span className="min-w-0 leading-tight">
            <span className="text-ink block truncate text-[14px] font-semibold">{s.name}</span>
            <span className="text-subtle block truncate text-[12.5px]">{s.shopName}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'email',
      header: t('common.email'),
      cell: (s) => <span className="text-muted text-[14px]">{s.email}</span>,
    },
    {
      key: 'phone',
      header: t('common.phone'),
      cell: (s) => <span className="num text-[14px]">{s.phone}</span>,
    },
    {
      key: 'joined',
      header: t('admin.sellers.registered'),
      cell: (s) => <span className="num text-muted text-[14px]">{date(s.joinedAt)}</span>,
    },
    {
      key: 'orders',
      header: t('admin.sellers.totalOrders'),
      align: 'center',
      cell: (s) => <span className="num font-semibold">{num(s.orders)}</span>,
    },
    {
      key: 'earnings',
      header: t('admin.sellers.totalEarnings'),
      align: 'right',
      cell: (s) => <Money value={s.earnings} className="text-ink font-semibold" />,
    },
    {
      key: 'available',
      header: t('admin.sellers.available'),
      align: 'right',
      cell: (s) => <Money value={s.available} />,
    },
    {
      key: 'status',
      header: t('admin.sellers.accountStatus'),
      cell: (s) => <StatusPill kind="seller" value={s.status} />,
    },
    {
      key: 'actions',
      align: 'right',
      cell: (s) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Dropdown
            items={[
              {
                label: t('common.view'),
                icon: 'eye',
                onClick: () => router.push(`/admin/sellers/${s.id}`),
              },
              { type: 'separator' },
              ...actionsFor(s).map((a) => ({
                label: a.label,
                icon: a.icon,
                destructive: a.destructive,
                onClick: () => setPending({ seller: s, action: a }),
              })),
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
      <PageHeader title={title} description={t('admin.sellers.subtitle')} />
      <Tabs
        variant="line"
        value={status}
        onValueChange={setStatus}
        items={(['all', 'active', 'pending', 'inactive', 'suspended'] as const).map((s) => ({
          value: s,
          label: (
            <span className="flex items-center gap-1.5">
              {s === 'all' ? t('common.all') : t(`status.seller.${s}`)}
              <span className="bg-well text-muted num rounded-full px-1.5 text-[11px]">
                {num(counts(s))}
              </span>
            </span>
          ),
        }))}
      />
      <ListToolbar
        query={list.query}
        onQuery={list.setQuery}
        placeholder={t('admin.sellers.searchPlaceholder')}
        end={
          <Dropdown
            items={[
              { label: t('common.newest'), onClick: () => list.setSort('newest') },
              { label: t('admin.sellers.totalOrders'), onClick: () => list.setSort('orders') },
              { label: t('admin.sellers.totalEarnings'), onClick: () => list.setSort('earnings') },
            ]}
          >
            <Button variant="secondary" size="md">
              <Icon name="sliders" size={16} />
              {t('common.sortBy')}
            </Button>
          </Dropdown>
        }
      />
      <DataTable
        columns={columns}
        source={list.pageRows}
        rowKey="id"
        onRowClick={(s) => router.push(`/admin/sellers/${s.id}`)}
        page={list.page}
        limit={list.limit}
        total={list.total}
        onPaginate={list.setPage}
        empty={{ title: t('common.noResults'), description: t('common.noResultsHint') }}
      />
      <SellerStatusConfirm pending={pending} onClose={() => setPending(null)} />
    </div>
  );
}
