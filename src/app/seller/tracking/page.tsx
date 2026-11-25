'use client';

import * as React from 'react';
import Link from 'next/link';

import { useI18n } from '@/i18n/provider';
import { Panel } from '@components/dashboard/panel';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { OrderProgress, OrderTimeline } from '@components/platform/order-timeline';
import { StatusPill } from '@components/platform/status-pill';
import { Callout, PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { IN_TRANSIT_STATUSES, PENDING_STATUSES } from '@lib/business/orders';
import { cn } from '@lib/utils';

import { useSellerRecords } from '../components/use-seller-data';

export default function TrackingPage() {
  const { t, relative } = useI18n();
  const { orders } = useSellerRecords();
  const active = orders.filter(
    (o) => PENDING_STATUSES.includes(o.status) || IN_TRANSIT_STATUSES.includes(o.status),
  );
  const [query, setQuery] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | null>(active[0]?.id ?? null);
  const [notFound, setNotFound] = React.useState(false);
  const selected = orders.find((o) => o.id === selectedId);

  const track = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    const hit = orders.find(
      (o) => o.id.toLowerCase() === q || o.customer.phone === q || o.id.toLowerCase().endsWith(q),
    );
    setNotFound(!hit);
    if (hit) setSelectedId(hit.id);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('seller.orders.trackingTitle')}
        description={t('seller.orders.trackingSubtitle')}
      />
      <form
        onSubmit={track}
        className="bg-panel border-line flex flex-col gap-2 rounded-2xl border p-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <Icon
            name="search"
            size={17}
            className="text-muted absolute top-1/2 left-3 -translate-y-1/2"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('seller.orders.trackPlaceholder')}
            className="h-11 pl-10 text-sm"
          />
        </div>
        <Button type="submit" variant="primary" size="lg" className="h-11">
          <Icon name="shipping" size={17} />
          {t('seller.orders.track')}
        </Button>
      </form>
      {notFound && <Callout tone="warn" compact description={t('seller.orders.notFound')} />}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Panel
          title={`${t('seller.orders.activeOrders')} (${active.length})`}
          className="lg:self-start"
          bodyClassName="max-h-[640px] overflow-y-auto"
        >
          <ul className="space-y-2">
            {active.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(o.id);
                    setNotFound(false);
                  }}
                  className={cn(
                    'focus-ring w-full rounded-xl border p-3 text-left transition-colors',
                    o.id === selectedId
                      ? 'border-brand bg-brand-soft/50'
                      : 'border-line hover:bg-well',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink text-[13px] font-bold">{o.id}</span>
                    <StatusPill kind="order" value={o.status} />
                  </div>
                  <p className="text-muted mt-1 line-clamp-1 text-xs">
                    {o.productName} · {o.customer.name}
                  </p>
                  <div className="mt-2.5">
                    <OrderProgress order={o} />
                  </div>
                  <p className="text-subtle mt-1.5 text-[11px]">
                    {relative(o.history[o.history.length - 1]!.at)}
                  </p>
                </button>
              </li>
            ))}
            {active.length === 0 && (
              <li className="text-muted py-6 text-center text-sm">{t('common.noResults')}</li>
            )}
          </ul>
        </Panel>
        {selected ? (
          <Panel
            title={t('seller.orders.detailTitle', { id: selected.id })}
            description={`${selected.productName} · ${selected.customer.name}`}
            action={<StatusPill kind="order" value={selected.status} />}
          >
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_240px]">
              <OrderTimeline order={selected} />
              <div className="bg-well/60 h-fit space-y-2 rounded-xl p-4 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-muted">{t('seller.orders.courier')}</span>
                  <span className="text-ink font-medium">{selected.courier ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">{t('seller.orders.trackingCode')}</span>
                  <span className="font-mono text-xs">{selected.trackingCode ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">{t('seller.order.codAmount')}</span>
                  <Money
                    value={selected.sellingPrice * selected.quantity}
                    className="text-ink font-semibold"
                  />
                </div>
                <Button variant="outline" size="sm" asChild className="mt-2 w-full">
                  <Link href={`/seller/orders/${selected.id}`}>{t('common.viewDetails')}</Link>
                </Button>
              </div>
            </div>
          </Panel>
        ) : (
          <Panel>
            <p className="text-muted py-16 text-center text-sm">
              {t('seller.orders.trackPlaceholder')}
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}
