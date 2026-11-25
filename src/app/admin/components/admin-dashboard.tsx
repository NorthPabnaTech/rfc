'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import { AreaTrend, BarList, BarSeries, Donut, Legend } from '@components/charts/charts';
import { STATUS_COLOR, useChartFormat } from '@components/charts/use-chart-format';
import { KpiCard, KpiGrid, Panel } from '@components/dashboard/panel';
import { Icon } from '@components/icon/icon';
import { orderColumns, TxTypeCell } from '@components/platform/columns';
import { Money } from '@components/platform/money';
import { StatusPill } from '@components/platform/status-pill';
import { UserAvatar } from '@components/platform/user-avatar';
import { PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { DataTable } from '@components/ui/data-table';
import {
  computeFinancials,
  monthlySeries,
  statusBreakdown,
  topProducts,
} from '@lib/business/analytics';

/** % change helper for KPI deltas (this month vs last month). */
export function delta(curr: number, prev: number, i18n: ReturnType<typeof useI18n>) {
  if (!prev) return null;
  const v = ((curr - prev) / prev) * 100;
  return { value: v, label: i18n.t('common.vsLastMonth'), text: i18n.percent(Math.abs(v)) };
}

export function AdminDashboard() {
  const i18n = useI18n();
  const { t, num, money } = i18n;
  const fmt = useChartFormat();
  const router = useRouter();
  const s = usePlatformStore();

  const fin = React.useMemo(() => computeFinancials(s), [s]);
  const months = React.useMemo(() => monthlySeries(s, 6), [s]);
  const [prev, curr] = [months[months.length - 2]!, months[months.length - 1]!];
  const pendingW = s.withdrawals.filter((w) => w.status === 'pending');
  const statuses = statusBreakdown(s.orders);
  const top = topProducts(s.orders, 5);
  const totalEarnings = s.earnings.reduce((a, e) => a + e.amount, 0);
  const sellerName = (id: string) => s.sellers.find((x) => x.id === id);

  const incomeSeries = [
    { key: 'platformIncome', label: t('admin.dashboard.income') },
    { key: 'expenses', label: t('admin.dashboard.expenses') },
  ];
  const ordersSeries = [
    { key: 'delivered', label: t('status.order.delivered'), color: 'var(--chart-1)' },
    { key: 'cancelled', label: t('status.order.cancelled'), color: 'var(--chart-2)' },
    { key: 'returned', label: t('status.order.returned'), color: 'var(--chart-3)' },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title={t('admin.dashboard.title')}
        description={t('admin.dashboard.subtitle')}

        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href="/admin/analysis">
                <Icon name="analytics" size={16} />
                {t('nav.analysis')}
              </Link>
            </Button>
            <Button variant="primary" asChild>
              <Link href="/admin/products/new">
                <Icon name="plus" size={16} />
                {t('admin.products.add')}
              </Link>
            </Button>
          </>
        }
      />

      <KpiGrid>
        <KpiCard
          label={t('admin.dashboard.totalSellers')}
          value={num(s.sellers.length)}
          icon="users"
          tone="brand"
          href="/admin/sellers"
          hint={`${num(s.sellers.filter((x) => x.status === 'pending').length)} ${t('status.seller.pending')}`}
        />
        <KpiCard
          label={t('admin.dashboard.activeSellers')}
          value={num(s.sellers.filter((x) => x.status === 'active').length)}
          icon="userCheck"
          tone="ok"
          href="/admin/sellers?status=active"
        />
        <KpiCard
          label={t('admin.dashboard.totalProducts')}
          value={num(s.products.length)}
          icon="box"
          tone="navy"
          href="/admin/products"
        />
        <KpiCard
          label={t('admin.dashboard.totalOrders')}
          value={num(s.orders.length)}
          icon="cart"
          tone="sun"
          href="/admin/orders"
          delta={delta(curr.orders, prev.orders, i18n)}
        />
        <KpiCard
          label={t('admin.dashboard.totalRevenue')}
          value={money(fin.revenue)}
          icon="trend"
          tone="brand"
          delta={delta(curr.revenue, prev.revenue, i18n)}
        />
        <KpiCard
          label={t('admin.dashboard.platformProfit')}
          value={money(fin.platformProfit)}
          icon="coin"
          tone="ok"
          delta={delta(curr.platformProfit, prev.platformProfit, i18n)}
        />
        <KpiCard
          label={t('admin.dashboard.pendingWithdrawals')}
          value={money(pendingW.reduce((a, w) => a + w.amount, 0))}
          icon="moneySend"
          tone="warn"
          href="/admin/finance/withdrawals"
          hint={t('admin.dashboard.requests', { count: num(pendingW.length) })}
        />
        <KpiCard
          label={t('admin.dashboard.sellerEarnings')}
          value={money(totalEarnings)}
          icon="moneyBag"
          tone="violet"
          href="/admin/finance/earnings"
        />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title={t('admin.dashboard.revenueVsExpenses')}
          description={t('admin.dashboard.revenueVsExpensesDesc')}
          action={<Legend series={incomeSeries} className="hidden sm:flex" />}
        >
          <Legend series={incomeSeries} className="mb-3 sm:hidden" />
          <AreaTrend
            data={months}
            xKey="key"
            series={incomeSeries}
            format={fmt.money}
            tickFormat={fmt.moneyTick}
            xTickFormat={fmt.monthLabel}
            height={330}
          />
        </Panel>
        <Panel
          title={t('admin.dashboard.profitSplit')}
          description={t('admin.dashboard.profitSplitDesc')}
        >
          <Donut
            data={[
              {
                key: 'platform',
                label: t('admin.analysis.platformProfit'),
                value: fin.platformProfit,
              },
              { key: 'seller', label: t('admin.analysis.sellerProfit'), value: fin.sellerProfit },
            ]}
            format={fmt.money}
            centerValue={money(fin.platformProfit + fin.sellerProfit, { compact: true })}
            centerLabel={t('common.total')}
          />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <SplitStat
              color="var(--chart-1)"
              label={t('admin.analysis.platformProfit')}
              value={fin.platformProfit}
              total={fin.platformProfit + fin.sellerProfit}
            />
            <SplitStat
              color="var(--chart-2)"
              label={t('admin.analysis.sellerProfit')}
              value={fin.sellerProfit}
              total={fin.platformProfit + fin.sellerProfit}
            />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Panel
          title={t('admin.dashboard.ordersOverview')}
          description={t('admin.dashboard.ordersOverviewDesc')}
        >
          <Legend series={ordersSeries} className="mb-3" />
          <BarSeries
            data={months}
            xKey="key"
            series={ordersSeries}
            stacked
            format={fmt.count}
            tickFormat={fmt.count}
            xTickFormat={fmt.monthLabel}
            height={230}
          />
        </Panel>
        <Panel
          title={t('admin.dashboard.monthlyRevenue')}
          description={t('admin.dashboard.monthlyRevenueDesc')}
        >
          <BarSeries
            data={months}
            xKey="key"
            series={[{ key: 'revenue', label: t('admin.analysis.revenue') }]}
            format={fmt.money}
            tickFormat={fmt.moneyTick}
            xTickFormat={fmt.monthLabel}
            height={258}
          />
        </Panel>
        <Panel title={t('admin.dashboard.statusBreakdown')} className="lg:col-span-2 xl:col-span-1">
          <BarList
            rows={statuses.map((r) => ({
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
          title={t('admin.dashboard.recentOrders')}
          href="/admin/orders"
          hrefLabel={t('common.viewAll')}
          flush
        >
          <DataTable
            columns={orderColumns(i18n, {
              base: '/admin',
              sellers: s.sellers,
              showSeller: true,
            }).filter((c) => ['id', 'product', 'amount', 'status'].includes(c.key))}
            source={s.orders.slice(0, 6)}
            rowKey="id"
            onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
            classNames={{ root: 'rounded-none border-x-0 border-b-0' }}
          />
        </Panel>
        <Panel
          title={t('admin.dashboard.pendingWithdrawalRequests')}
          href="/admin/finance/withdrawals"
          hrefLabel={t('common.viewAll')}
        >
          {pendingW.length === 0 ? (
            <p className="text-muted py-8 text-center text-sm">{t('common.noResults')}</p>
          ) : (
            <ul className="divide-line -my-2 divide-y">
              {pendingW.slice(0, 5).map((w) => {
                const seller = sellerName(w.sellerId);
                return (
                  <li key={w.id} className="flex items-center gap-3 py-3">
                    <UserAvatar name={seller?.name ?? '?'} color={seller?.avatarColor} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="text-ink truncate text-[14px] font-semibold">
                        {seller?.name}
                      </div>
                      <div className="text-muted text-xs">
                        {t(`payment.${w.method}`)} · {i18n.relative(w.requestedAt)}
                      </div>
                    </div>
                    <Money value={w.amount} className="text-ink text-sm font-bold" />
                  </li>
                );
              })}
            </ul>
          )}
          <Button variant="outline" asChild className="mt-4 w-full">
            <Link href="/admin/finance/withdrawals">{t('admin.dashboard.review')}</Link>
          </Button>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel
          title={t('admin.dashboard.recentSellers')}
          href="/admin/sellers"
          hrefLabel={t('common.viewAll')}
        >
          <ul className="divide-line -my-2 divide-y">
            {[...s.sellers]
              .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt))
              .slice(0, 5)
              .map((x) => (
                <li key={x.id}>
                  <Link
                    href={`/admin/sellers/${x.id}`}
                    className="hover:bg-well -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5"
                  >
                    <UserAvatar name={x.name} color={x.avatarColor} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="text-ink truncate text-[14px] font-semibold">{x.name}</div>
                      <div className="text-muted truncate text-xs">{x.shopName}</div>
                    </div>
                    <StatusPill kind="seller" value={x.status} />
                  </Link>
                </li>
              ))}
          </ul>
        </Panel>
        <Panel
          title={t('admin.dashboard.recentTransactions')}
          href="/admin/finance/transactions"
          hrefLabel={t('common.viewAll')}
        >
          <ul className="divide-line -my-2 divide-y">
            {s.transactions.slice(0, 6).map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <TxTypeCell type={x.type} i18n={i18n} />
                </div>
                <div className="text-right">
                  <Money
                    value={x.amount}
                    signed
                    tone="auto"
                    className="block text-[14px] font-semibold"
                  />
                  <span className="text-subtle text-[11px]">{i18n.relative(x.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel
          title={t('admin.dashboard.topProducts')}
          href="/admin/products"
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
                    href={`/admin/products/${p.productId}`}
                    className="text-ink hover:text-accent line-clamp-1 text-[14px] font-semibold"
                  >
                    {p.name}
                  </Link>
                  <div className="text-muted text-xs">
                    {t('seller.dashboard.sold', { count: num(p.qty) })}
                  </div>
                </div>
                <Money value={p.revenue} compact className="text-ink text-[14px] font-bold" />
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}

function SplitStat({
  color,
  label,
  value,
  total,
}: {
  color: string;
  label: string;
  value: number;
  total: number;
}) {
  const { percent } = useI18n();
  return (
    <div className="bg-well/60 rounded-xl p-3">
      <div className="text-muted flex items-center gap-1.5 text-[12.5px] font-medium">
        <span className="size-2 rounded-full" style={{ background: color }} />
        {label}
      </div>
      <Money value={value} className="text-ink mt-1 block text-base font-bold" />
      <span className="text-subtle num text-[11px]">
        {percent(total ? (value / total) * 100 : 0)}
      </span>
    </div>
  );
}
