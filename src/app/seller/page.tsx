'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';

import { useI18n } from '@/i18n/provider';
import { useResellerAuth } from '@/stores/reseller-auth';
import { AreaTrend, BarList, BarSeries } from '@components/charts/charts';
import { STATUS_COLOR, useChartFormat } from '@components/charts/use-chart-format';
import { KpiCard, Panel } from '@components/dashboard/panel';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { StatusPill } from '@components/platform/status-pill';
import { Button } from '@components/ui/button';
import { type Column, DataTable } from '@components/ui/data-table';
import { Select } from '@components/ui/select';
import type { ResellerOrder, WalletTransaction } from '@lib/api/reseller';

import {
  useSellerDashboard,
  useSellerOrders,
  useSellerTransactions,
} from './components/use-seller-data';

export default function SellerDashboardPage() {
  const { t, num, money, dateTime } = useI18n();
  const fmt = useChartFormat();
  const router = useRouter();
  const reseller = useResellerAuth((s) => s.reseller);
  const [days, setDays] = React.useState(30);

  const { data: dash, loading } = useSellerDashboard(days);
  const { orders: recentOrders, loading: ordersLoading } = useSellerOrders({ page: 1, limit: 5 });
  const { items: recentTx, loading: txLoading } = useSellerTransactions({ page: 1, limit: 5 });

  if (!reseller) return null;

  const walletBalance = dash?.walletBalance ?? reseller.walletBalance ?? 0;
  const totalDeposited = dash?.totalDeposited ?? reseller.totalDeposited ?? 0;
  const totalProfitEarned = dash?.totalProfitEarned ?? reseller.totalProfitEarned ?? 0;
  const totalSales = dash?.totalSales ?? reseller.totalSales ?? 0;
  const totalOrders = dash?.totalOrders ?? reseller.totalOrders ?? 0;
  const sc = dash?.statusCounts;
  const pendingCount = (sc?.pending ?? 0) + (sc?.confirmed ?? 0) + (sc?.processing ?? 0);
  const deliveredCount = sc?.delivered ?? 0;
  const cancelledCount = sc?.cancelled ?? 0;

  const chartData = dash?.chart ?? [];

  const statusRows = [
    { key: 'pending', label: 'Pending', value: sc?.pending ?? 0, color: STATUS_COLOR.placed },
    {
      key: 'confirmed',
      label: 'Confirmed',
      value: sc?.confirmed ?? 0,
      color: STATUS_COLOR.confirmed,
    },
    {
      key: 'processing',
      label: 'Processing',
      value: sc?.processing ?? 0,
      color: STATUS_COLOR.processing,
    },
    { key: 'shipped', label: 'Shipped', value: sc?.shipped ?? 0, color: STATUS_COLOR.shipped },
    {
      key: 'delivered',
      label: 'Delivered',
      value: sc?.delivered ?? 0,
      color: STATUS_COLOR.delivered,
    },
    {
      key: 'cancelled',
      label: 'Cancelled',
      value: sc?.cancelled ?? 0,
      color: STATUS_COLOR.cancelled,
    },
    { key: 'returned', label: 'Returned', value: sc?.returned ?? 0, color: STATUS_COLOR.returned },
  ].filter((r) => r.value > 0);

  const orderCols: Column<ResellerOrder>[] = [
    {
      key: 'orderNumber',
      header: t('common.id'),
      cell: (o) => <span className="font-mono text-xs font-bold">{o.orderNumber}</span>,
    },
    {
      key: 'customer',
      header: t('seller.orders.customerInfo'),
      cell: (o) => <span className="text-[13px]">{o.customer?.name || '—'}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      cell: (o) => <Money value={o.total} className="font-semibold" />,
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (o) => <StatusPill kind="order" value={o.status} />,
    },
  ];

  const txCols: Column<WalletTransaction>[] = [
    {
      key: 'type',
      header: t('common.type'),
      cell: (x) => (
        <div>
          <p className="text-[13px] font-medium capitalize">{x.type.replace(/_/g, ' ')}</p>
          <p className="text-subtle text-[11px]">{dateTime(x.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: t('common.amount'),
      align: 'right',
      cell: (x) => (
        <Money
          value={x.direction === 'debit' ? -x.amount : x.amount}
          signed
          className={
            x.direction === 'credit'
              ? 'font-bold text-[var(--status-ok-fg)]'
              : 'font-bold text-[var(--status-danger-fg)]'
          }
        />
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (x) => <StatusPill kind="tx" value={x.status === 'rejected' ? 'failed' : x.status} />,
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="type-page-title text-ink">
            {t('seller.dashboard.greeting', { name: reseller.name.split(' ')[0]! })}
          </h1>
          <p className="type-body text-muted mt-1">{t('seller.dashboard.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            size="md"
            className="w-36"
            value={String(days)}
            onValueChange={(v) => setDays(Number(v))}
            items={[
              { value: '7', label: 'Last 7 days' },
              { value: '14', label: 'Last 14 days' },
              { value: '30', label: 'Last 30 days' },
              { value: '90', label: 'Last 90 days' },
            ]}
            aria-label="Date range"
          />
          <Button variant="secondary" asChild>
            <Link href="/seller/wallet/add-balance">
              <Icon name="moneyAdd" size={16} />
              {t('seller.dashboard.addBalance')}
            </Link>
          </Button>
          <Button asChild variant="primary">
            <Link href="/seller/orders/new">
              <Icon name="plus" size={16} />
              {t('seller.dashboard.quickOrder')}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div className="from-brand-500 to-noir relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white">
          <span
            className="absolute -top-16 -right-10 size-48 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          <span
            className="absolute -bottom-20 -left-10 size-48 rounded-full bg-[#fb8500]/25 blur-3xl"
            aria-hidden
          />
          <div className="relative flex items-center gap-2 text-sm text-white/80">
            <Icon name="wallet" size={17} />
            {t('seller.dashboard.available')}
          </div>
          <p className="num relative mt-2 text-4xl font-extrabold tracking-tight">
            {money(walletBalance)}
          </p>
          <div className="relative mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
              <p className="text-xs text-white/70">Total Deposited</p>
              <p className="num mt-1 text-lg font-bold">{money(totalDeposited)}</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
              <p className="text-xs text-white/70">{t('seller.dashboard.totalEarnings')}</p>
              <p className="num mt-1 text-lg font-bold">{money(totalProfitEarned)}</p>
            </div>
          </div>
          <div className="relative mt-4 flex gap-2">
            <Button asChild size="md" className="bg-[#ffffff] text-[#023047] hover:bg-[#ffffff]/90">
              <Link href="/seller/wallet/withdraw">{t('nav.withdraw')}</Link>
            </Button>
            <Button
              asChild
              size="md"
              className="border border-white/25 bg-white/5 text-white hover:bg-white/15"
            >
              <Link href="/seller/wallet">{t('common.viewDetails')}</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <KpiCard
            label={t('seller.dashboard.totalOrders')}
            value={loading ? '—' : num(totalOrders)}
            icon="cart"
            tone="brand"
            href="/seller/orders"
          />
          <KpiCard
            label={t('seller.dashboard.pendingOrders')}
            value={loading ? '—' : num(pendingCount)}
            icon="clock"
            tone="warn"
            href="/seller/orders?status=pending"
          />
          <KpiCard
            label={t('seller.dashboard.deliveredOrders')}
            value={loading ? '—' : num(deliveredCount)}
            icon="delivered"
            tone="ok"
            href="/seller/orders?status=delivered"
          />
          <KpiCard
            label="Total Sales"
            value={loading ? '—' : money(totalSales)}
            icon="analytics"
            tone={cancelledCount > 0 ? 'info' : 'brand'}
            href="/seller/wallet/earnings"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel
          title={t('seller.dashboard.earningsOverview')}
          description={`Revenue & profit over the last ${days} days`}
        >
          {chartData.length === 0 ? (
            <p className="text-muted py-16 text-center text-sm">
              {loading ? t('common.loading') : t('common.noResults')}
            </p>
          ) : (
            <AreaTrend
              data={chartData}
              xKey="date"
              series={[
                { key: 'revenue', label: 'Revenue' },
                { key: 'profit', label: 'Profit' },
              ]}
              format={(v) => fmt.money(v)}
              tickFormat={fmt.moneyTick}
              xTickFormat={fmt.dayLabel}
              labelFormat={fmt.dayLabel}
            />
          )}
        </Panel>

        <Panel
          title="Daily Orders"
          description={`Orders placed over the last ${days} days`}
        >
          {chartData.length === 0 ? (
            <p className="text-muted py-16 text-center text-sm">
              {loading ? t('common.loading') : t('common.noResults')}
            </p>
          ) : (
            <BarSeries
              data={chartData}
              xKey="date"
              series={[{ key: 'orders', label: 'Orders' }]}
              format={(v) => num(v)}
              xTickFormat={fmt.dayLabel}
              labelFormat={fmt.dayLabel}
            />
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel
          title="Order Status Breakdown"
          className="lg:col-span-1"
        >
          {statusRows.length === 0 ? (
            <p className="text-muted py-8 text-center text-sm">{t('common.noResults')}</p>
          ) : (
            <BarList rows={statusRows} format={(v) => num(v)} />
          )}
        </Panel>

        <Panel
          title={t('seller.dashboard.recentOrders')}
          href="/seller/orders"
          hrefLabel={t('common.viewAll')}
          className="lg:col-span-2"
          flush
        >
          <DataTable
            columns={orderCols}
            source={recentOrders}
            rowKey="id"
            isLoading={ordersLoading}
            onRowClick={(o) => router.push(`/seller/orders/${o.id}`)}
            classNames={{ root: 'rounded-none border-x-0 border-b-0' }}
            empty={{ title: t('seller.orders.empty') }}
          />
        </Panel>
      </div>

      <Panel
        title={t('seller.wallet.recent')}
        href="/seller/wallet/transactions"
        hrefLabel={t('common.viewAll')}
        flush
      >
        <DataTable
          columns={txCols}
          source={recentTx}
          rowKey="id"
          isLoading={txLoading}
          classNames={{ root: 'rounded-none border-x-0 border-b-0' }}
          empty={{ title: t('common.noResults') }}
        />
      </Panel>
    </div>
  );
}
