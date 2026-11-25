'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore, useWallet } from '@/stores/platform-store';
import { AreaTrend, BarList, BarSeries } from '@components/charts/charts';
import { STATUS_COLOR, useChartFormat } from '@components/charts/use-chart-format';
import { KpiCard, Panel } from '@components/dashboard/panel';
import { Icon } from '@components/icon/icon';
import { orderColumns, TxTypeCell } from '@components/platform/columns';
import { Money } from '@components/platform/money';
import { NotificationRow, useMyNotifications } from '@components/platform/notification-bell';
import { Button } from '@components/ui/button';
import { DataTable } from '@components/ui/data-table';
import { useNow } from '@hooks/use-now';
import { dailySeries, monthlySeries, statusBreakdown, topProducts } from '@lib/business/analytics';
import { PENDING_STATUSES } from '@lib/business/orders';

import { useSellerRecords } from './components/use-seller-data';

export default function SellerDashboardPage() {
  const i18n = useI18n();
  const now = useNow();
  const { t, num, money, duration } = i18n;
  const fmt = useChartFormat();
  const router = useRouter();
  const { seller, orders, transactions, earnings } = useSellerRecords();
  const wallet = useWallet(seller?.id);
  const expenses = usePlatformStore((s) => s.expenses);
  const withdrawals = usePlatformStore((s) => s.withdrawals);
  const notifications = useMyNotifications('seller');

  const months = React.useMemo(
    () => monthlySeries({ orders, expenses, withdrawals }, 6, new Date(), seller?.id),
    [orders, expenses, withdrawals, seller?.id],
  );
  const days = React.useMemo(() => dailySeries(orders, 14), [orders]);
  const pendingEarnings = earnings
    .filter((e) => e.status === 'pending')
    .sort((a, b) => a.releaseAt.localeCompare(b.releaseAt));
  const top = topProducts(orders, 5);
  if (!seller) return null;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="type-page-title text-ink">
            {t('seller.dashboard.greeting', { name: seller.name.split(' ')[0]! })}
          </h1>
          <p className="type-body text-muted mt-1">{t('seller.dashboard.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" asChild>
            <Link href="/seller/wallet/add-balance">
              <Icon name="moneyAdd" size={16} />
              {t('seller.dashboard.addBalance')}
            </Link>
          </Button>
          <Button
            asChild
            className="bg-highlight text-highlight-contrast hover:bg-highlight-hover font-semibold"
          >
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
            {money(wallet.available)}
          </p>
          <div className="relative mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
              <p className="text-xs text-white/70">{t('seller.dashboard.pending')}</p>
              <p className="num mt-1 text-lg font-bold">{money(wallet.pending)}</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
              <p className="text-xs text-white/70">{t('seller.dashboard.totalEarnings')}</p>
              <p className="num mt-1 text-lg font-bold">{money(wallet.totalEarnings)}</p>
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
            value={num(orders.length)}
            icon="cart"
            tone="brand"
            href="/seller/orders"
          />
          <KpiCard
            label={t('seller.dashboard.pendingOrders')}
            value={num(orders.filter((o) => PENDING_STATUSES.includes(o.status)).length)}
            icon="clock"
            tone="warn"
            href="/seller/tracking"
          />
          <KpiCard
            label={t('seller.dashboard.deliveredOrders')}
            value={num(orders.filter((o) => o.status === 'delivered').length)}
            icon="delivered"
            tone="ok"
          />
          <KpiCard
            label={t('seller.dashboard.cancelledOrders')}
            value={num(orders.filter((o) => o.status === 'cancelled').length)}
            icon="cancelCircle"
            tone="danger"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel
          title={t('seller.dashboard.earningsOverview')}
          description={t('seller.dashboard.earningsOverviewDesc')}
        >
          <AreaTrend
            data={months}
            xKey="key"
            series={[{ key: 'sellerProfit', label: t('seller.dashboard.totalEarnings') }]}
            format={fmt.money}
            tickFormat={fmt.moneyTick}
            xTickFormat={fmt.monthLabel}
            height={240}
          />
        </Panel>
        <Panel
          title={t('seller.dashboard.ordersOverview')}
          description={t('seller.dashboard.ordersOverviewDesc')}
        >
          <BarSeries
            data={days}
            xKey="date"
            series={[
              { key: 'orders', label: t('seller.dashboard.totalOrders'), color: 'var(--chart-2)' },
            ]}
            format={fmt.count}
            tickFormat={fmt.count}
            xTickFormat={fmt.dayLabel}
            height={240}
          />
        </Panel>
        <Panel
          title={t('seller.dashboard.monthlySales')}
          description={t('seller.dashboard.monthlySalesDesc')}
        >
          <BarSeries
            data={months}
            xKey="key"
            series={[{ key: 'revenue', label: t('seller.dashboard.monthlySales') }]}
            format={fmt.money}
            tickFormat={fmt.moneyTick}
            xTickFormat={fmt.monthLabel}
            height={240}
          />
        </Panel>
        <Panel title={t('seller.dashboard.statusBreakdown')}>
          <BarList
            rows={statusBreakdown(orders).map((r) => ({
              key: r.status,
              label: t(`status.order.${r.status}`),
              value: r.count,
              color: STATUS_COLOR[r.status],
            }))}
            format={fmt.count}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title={t('seller.dashboard.recentOrders')}
          href="/seller/orders"
          hrefLabel={t('common.viewAll')}
          flush
        >
          <DataTable
            columns={orderColumns(i18n, { base: '/seller' }).filter(
              (c) => c.key !== 'qty' && c.key !== 'date',
            )}
            source={orders.slice(0, 6)}
            rowKey="id"
            onRowClick={(o) => router.push(`/seller/orders/${o.id}`)}
            classNames={{ root: 'rounded-none border-x-0 border-b-0' }}
            empty={{ title: t('seller.orders.empty'), description: t('seller.orders.emptyDesc') }}
          />
        </Panel>
        <Panel
          title={t('seller.dashboard.pendingEarnings')}
          href="/seller/wallet/earnings"
          hrefLabel={t('common.viewAll')}
        >
          {pendingEarnings.length === 0 ? (
            <p className="text-muted py-8 text-center text-sm">{t('seller.dashboard.noPending')}</p>
          ) : (
            <ul className="space-y-2.5">
              {pendingEarnings.slice(0, 5).map((e) => (
                <li
                  key={e.id}
                  className="bg-well/60 flex items-center justify-between gap-3 rounded-xl p-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/seller/orders/${e.orderId}`}
                      className="text-ink text-[13px] font-semibold hover:underline"
                    >
                      {e.orderId}
                    </Link>
                    <p className="num text-xs text-[var(--status-warn-fg)]">
                      {t('seller.dashboard.releasesIn', {
                        time: duration(Math.max(0, new Date(e.releaseAt).getTime() - now)),
                      })}
                    </p>
                  </div>
                  <Money value={e.amount} className="text-ink font-bold" />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel
          title={t('seller.dashboard.recentTransactions')}
          href="/seller/wallet/transactions"
          hrefLabel={t('common.viewAll')}
        >
          <ul className="divide-line -my-2 divide-y">
            {transactions.slice(0, 6).map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 py-2.5">
                <TxTypeCell type={x.type} i18n={i18n} />
                <div className="text-right">
                  <Money
                    value={x.amount}
                    signed
                    tone="auto"
                    className="block text-[13px] font-semibold"
                  />
                  <span className="text-subtle text-[11px]">{i18n.relative(x.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel
          title={t('seller.dashboard.topProducts')}
          href="/seller/products"
          hrefLabel={t('common.viewAll')}
        >
          <ol className="space-y-3.5">
            {top.map((p, idx) => (
              <li key={p.productId} className="flex items-center gap-3">
                <span className="bg-well text-muted num grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold">
                  {num(idx + 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/seller/products/${p.productId}`}
                    className="text-ink hover:text-accent line-clamp-1 text-[13px] font-semibold"
                  >
                    {p.name}
                  </Link>
                  <p className="text-muted text-xs">
                    {t('seller.dashboard.sold', { count: num(p.qty) })}
                  </p>
                </div>
                <Money value={p.revenue} compact className="text-ink text-[13px] font-bold" />
              </li>
            ))}
          </ol>
        </Panel>
        <Panel
          title={t('seller.dashboard.recentActivity')}
          href="/seller/notifications"
          hrefLabel={t('common.viewAll')}
        >
          <div className="-mx-2 -my-1">
            {notifications.slice(0, 4).map((n) => (
              <NotificationRow key={n.id} n={n} />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
