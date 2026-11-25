'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';

import { useI18n } from '@/i18n/provider';
import { ListToolbar } from '@components/dashboard/list-toolbar';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { StatusPill } from '@components/platform/status-pill';
import { EmptyState, PageHeader, StatCard, StatCardGrid } from '@components/shared';
import { Button } from '@components/ui/button';
import { type Column, DataTable } from '@components/ui/data-table';
import { Select } from '@components/ui/select';
import type { ResellerOrder } from '@lib/api/reseller';

import { useSellerDashboard, useSellerOrders } from '../components/use-seller-data';

const STATUS_TABS = [
  'all',
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
] as const;

export default function SellerOrdersPage() {
  return (
    <React.Suspense>
      <OrdersContent />
    </React.Suspense>
  );
}

function OrdersContent() {
  const { t, dateTime, num } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status');
  const [status, setStatus] = React.useState(
    initialStatus && (STATUS_TABS as readonly string[]).includes(initialStatus)
      ? initialStatus
      : 'all',
  );
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [query, setQuery] = React.useState('');

  const { data: dash, loading: dashLoading } = useSellerDashboard();
  const { orders, total, loading } = useSellerOrders({
    page,
    limit,
    status: status === 'all' ? '' : status,
  });

  const selectStatus = (next: string) => {
    setStatus(next);
    setPage(1);
  };

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        (o.customer?.name ?? '').toLowerCase().includes(q) ||
        (o.customer?.phone ?? '').toLowerCase().includes(q),
    );
  }, [orders, query]);

  const columns: Column<ResellerOrder>[] = [
    {
      key: 'orderNumber',
      header: t('common.id'),
      cell: (o) => <span className="text-ink font-mono text-xs font-bold">{o.orderNumber}</span>,
    },
    {
      key: 'date',
      header: t('common.date'),
      cell: (o) => <span className="num text-muted text-[13px]">{dateTime(o.createdAt)}</span>,
    },
    {
      key: 'customer',
      header: t('seller.orders.customerInfo'),
      cell: (o) => (
        <div>
          <p className="text-ink text-[13px] font-semibold">{o.customer?.name || '—'}</p>
          <p className="num text-muted text-xs">{o.customer?.phone || ''}</p>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'COD Total',
      align: 'right',
      cell: (o) => <Money value={o.total} className="font-semibold" />,
    },
    {
      key: 'profit',
      header: t('seller.orders.profit'),
      align: 'right',
      cell: (o) => (
        <Money
          value={o.resellerSummary?.expectedResellerProfit ?? 0}
          className="font-bold text-[var(--status-ok-fg)]"
        />
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (o) => <StatusPill kind="order" value={o.status} />,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('seller.orders.title')}
        description={t('seller.orders.subtitle')}
        actions={
          <Button asChild variant="primary">
            <Link href="/seller/orders/new">
              <Icon name="plus" size={16} />
              {t('nav.placeOrder')}
            </Link>
          </Button>
        }
      />

      <StatCardGrid>
        <StatCard
          label="All orders"
          value={dashLoading ? '—' : num(dash?.totalOrders ?? total)}
          icon="cart"
          tone="accent"
          active={status === 'all'}
          onClick={() => selectStatus('all')}
        />
        <StatCard
          label="Pending"
          value={dashLoading ? '—' : num(dash?.statusCounts?.pending ?? 0)}
          icon="clock"
          tone="warn"
          active={status === 'pending'}
          onClick={() => selectStatus('pending')}
        />
        <StatCard
          label="Delivered"
          value={dashLoading ? '—' : num(dash?.statusCounts?.delivered ?? 0)}
          icon="delivered"
          tone="ok"
          active={status === 'delivered'}
          onClick={() => selectStatus('delivered')}
        />
        <StatCard
          label="Cancelled"
          value={dashLoading ? '—' : num(dash?.statusCounts?.cancelled ?? 0)}
          icon="cancelCircle"
          tone="danger"
          active={status === 'cancelled'}
          onClick={() => selectStatus('cancelled')}
        />
      </StatCardGrid>

      <ListToolbar
        query={query}
        onQuery={setQuery}
        placeholder={t('common.searchPlaceholder')}
        end={
          <Select
            size="md"
            className="w-full sm:w-48"
            value={status}
            onValueChange={selectStatus}
            aria-label={t('common.status')}
            items={STATUS_TABS.map((k) => ({
              value: k,
              label: k === 'all' ? 'All statuses' : k.charAt(0).toUpperCase() + k.slice(1),
            }))}
          />
        }
      />

      {!loading && orders.length === 0 && status === 'all' ? (
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
        <DataTable
          columns={columns}
          source={filtered}
          rowKey="id"
          isLoading={loading}
          page={page}
          limit={limit}
          total={total}
          onPaginate={setPage}
          pageSizeOptions={[15, 20, 50]}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
          onRowClick={(o) => router.push(`/seller/orders/${o.id}`)}
          empty={{ title: t('common.noResults') }}
        />
      )}
    </div>
  );
}
