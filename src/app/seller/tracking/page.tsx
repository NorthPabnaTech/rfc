'use client';

import * as React from 'react';
import Link from 'next/link';

import { useI18n } from '@/i18n/provider';
import { ListToolbar } from '@components/dashboard/list-toolbar';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { StatusPill } from '@components/platform/status-pill';
import { PageHeader, StatCard, StatCardGrid } from '@components/shared';
import { Button } from '@components/ui/button';
import { type Column, DataTable } from '@components/ui/data-table';
import { Select } from '@components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@components/ui/sheet';
import { useListState } from '@hooks/use-list-state';
import type { ResellerOrder } from '@lib/api/reseller';

import { useSellerOrder, useSellerOrders } from '../components/use-seller-data';

type TrackingBucket = 'all' | 'pending' | 'in_progress' | 'delivered';

export default function TrackingPage() {
  const { t, dateTime, relative, num } = useI18n();
  const { orders, loading } = useSellerOrders({ page: 1, limit: 100 });
  const [bucket, setBucket] = React.useState<TrackingBucket>('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const counts = React.useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let delivered = 0;
    for (const o of orders) {
      const s = o.status.toLowerCase();
      if (s === 'pending') pending += 1;
      else if (s === 'confirmed' || s === 'processing' || s === 'shipped') inProgress += 1;
      else if (s === 'delivered' || s === 'completed') delivered += 1;
    }
    return { all: orders.length, pending, inProgress, delivered };
  }, [orders]);

  const bucketRows = React.useMemo(() => {
    return orders.filter((o) => {
      const s = o.status.toLowerCase();
      if (bucket === 'pending' && s !== 'pending') return false;
      if (bucket === 'in_progress' && !['confirmed', 'processing', 'shipped'].includes(s)) {
        return false;
      }
      if (bucket === 'delivered' && !['delivered', 'completed'].includes(s)) return false;
      if (statusFilter !== 'all' && s !== statusFilter) return false;
      return true;
    });
  }, [orders, bucket, statusFilter]);

  const list = useListState({
    rows: bucketRows,
    search: (o) => [o.orderNumber, o.id, o.customer?.name, o.customer?.phone],
    pageSize: 10,
  });

  const selectBucket = (next: TrackingBucket) => {
    setBucket(next);
    setStatusFilter('all');
    list.setPage(1);
  };

  const columns: Column<ResellerOrder>[] = [
    {
      key: 'orderNumber',
      header: t('common.id'),
      cell: (o) => (
        <span className="text-ink font-mono text-xs font-semibold">{o.orderNumber}</span>
      ),
    },
    {
      key: 'customer',
      header: t('common.customer'),
      wrap: true,
      minWidth: 160,
      cell: (o) => (
        <div>
          <p className="text-ink text-[13px] font-medium">{o.customer?.name || '—'}</p>
          {o.customer?.phone && (
            <p className="num text-muted text-xs">{o.customer.phone}</p>
          )}
        </div>
      ),
    },
    {
      key: 'total',
      header: t('common.total'),
      cell: (o) => <Money value={o.total} className="font-semibold" />,
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (o) => <StatusPill kind="order" value={o.status} />,
    },
    {
      key: 'createdAt',
      header: t('common.date'),
      cell: (o) => <span className="text-muted text-xs">{relative(o.createdAt)}</span>,
    },
    {
      key: 'actions',
      align: 'right',
      cell: (o) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(o.id);
            }}
          >
            <Icon name="shipping" size={14} />
            {t('seller.orders.track')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            asChild
            onClick={(e) => e.stopPropagation()}
          >
            <Link href={`/seller/orders/${o.id}`}>
              <Icon name="eye" size={14} />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('seller.orders.trackingTitle')}
        description={t('seller.orders.trackingSubtitle')}
      />

      <StatCardGrid>
        <StatCard
          label="All orders"
          value={loading ? '—' : num(counts.all)}
          icon="cart"
          tone="accent"
          active={bucket === 'all'}
          onClick={() => selectBucket('all')}
        />
        <StatCard
          label="Pending"
          value={loading ? '—' : num(counts.pending)}
          icon="clock"
          tone="warn"
          active={bucket === 'pending'}
          onClick={() => selectBucket('pending')}
        />
        <StatCard
          label="In Progress"
          value={loading ? '—' : num(counts.inProgress)}
          icon="shipping"
          tone="info"
          active={bucket === 'in_progress'}
          onClick={() => selectBucket('in_progress')}
        />
        <StatCard
          label="Delivered"
          value={loading ? '—' : num(counts.delivered)}
          icon="delivered"
          tone="ok"
          active={bucket === 'delivered'}
          onClick={() => selectBucket('delivered')}
        />
      </StatCardGrid>

      <ListToolbar
        query={list.query}
        onQuery={list.setQuery}
        placeholder={t('seller.orders.trackPlaceholder')}
      >
        <Select
          className="w-40"
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            list.setPage(1);
          }}
          items={[
            { value: 'all', label: t('common.all') },
            { value: 'pending', label: 'Pending' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'processing', label: 'Processing' },
            { value: 'shipped', label: 'Shipped' },
            { value: 'delivered', label: 'Delivered' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'returned', label: 'Returned' },
          ]}
          aria-label={t('common.status')}
        />
      </ListToolbar>

      <DataTable
        columns={columns}
        source={list.pageRows}
        rowKey="id"
        onRowClick={(o) => setSelectedId(o.id)}
        isLoading={loading}
        page={list.page}
        limit={list.limit}
        total={list.total}
        onPaginate={list.setPage}
        onLimitChange={list.setLimit}
        empty={{
          title: t('common.noResults'),
          description: t('seller.orders.trackingSubtitle'),
        }}
      />

      <Sheet open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent side="right" className="flex w-full max-w-md flex-col p-0">
          <SheetHeader className="border-line border-b px-6 py-4">
            <SheetTitle>{t('seller.orders.timeline')}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-6">
            {selectedId && <OrderTrackDetail id={selectedId} dateTime={dateTime} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function OrderTrackDetail({
  id,
  dateTime,
}: {
  id: string;
  dateTime: (iso: string | number | Date) => string;
}) {
  const { t } = useI18n();
  const { order, loading } = useSellerOrder(id);

  if (loading) return <div className="skeleton h-48 rounded-xl" />;
  if (!order) return <p className="text-muted text-sm">{t('seller.orders.notFound')}</p>;

  const history = order.statusHistory ?? [];
  const FULL_STEPS = [
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'processing', label: 'Processing' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
  ] as const;

  const historyByStatus = new Map<string, (typeof history)[number]>();
  for (const h of history) {
    historyByStatus.set(h.status.toLowerCase(), h);
  }

  const currentStatus = order.status.toLowerCase();
  const isTerminal = currentStatus === 'cancelled' || currentStatus === 'returned';
  const currentIdx = FULL_STEPS.findIndex((step) => step.key === currentStatus);

  const steps = isTerminal
    ? [
        ...FULL_STEPS.filter((step) => historyByStatus.has(step.key)).map((step) => ({
          key: step.key,
          label: step.label,
          done: true,
          isDanger: false,
          entry: historyByStatus.get(step.key),
        })),
        {
          key: currentStatus,
          label: currentStatus === 'cancelled' ? 'Cancelled' : 'Returned',
          done: true,
          isDanger: true,
          entry: historyByStatus.get(currentStatus),
        },
      ]
    : FULL_STEPS.map((step, idx) => ({
        key: step.key,
        label: step.label,
        done: currentIdx >= 0 ? idx <= currentIdx : historyByStatus.has(step.key),
        isDanger: false,
        entry: historyByStatus.get(step.key),
      }));

  return (
    <div className="space-y-5">
      <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <p className="text-ink font-mono text-base font-bold">{order.orderNumber}</p>
          <p className="text-muted text-xs">{dateTime(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill kind="order" value={order.status} />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/seller/orders/${order.id}`}>{t('common.viewDetails')}</Link>
          </Button>
        </div>
      </div>

      <ol>
        {steps.map((step, idx) => {
          const ts = step.entry?.at || step.entry?.createdAt;
          const isLast = idx === steps.length - 1;
          return (
            <li
              key={`${step.key}-${idx}`}
              className="relative flex items-start gap-3 pb-5 last:pb-0"
            >
              {!isLast && (
                <span
                  aria-hidden
                  className={
                    step.done
                      ? 'bg-brand/40 absolute top-8 bottom-0 left-3.5 w-px'
                      : 'bg-line absolute top-8 bottom-0 left-3.5 w-px'
                  }
                />
              )}
              <span
                className={
                  step.isDanger
                    ? 'relative z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]'
                    : step.done
                      ? 'bg-brand-soft text-brand-ink relative z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full'
                      : 'border-line bg-well text-subtle relative z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border'
                }
              >
                <Icon
                  name={step.isDanger ? 'cancelCircle' : step.done ? 'check' : 'clock'}
                  size={14}
                />
              </span>
              <div className="min-w-0">
                <p
                  className={
                    step.done
                      ? 'text-ink text-sm font-semibold'
                      : 'text-muted text-sm font-medium'
                  }
                >
                  {step.label}
                </p>
                {step.entry?.note && <p className="text-muted text-xs">{step.entry.note}</p>}
                {ts && <p className="text-subtle text-[11px]">{dateTime(ts)}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
