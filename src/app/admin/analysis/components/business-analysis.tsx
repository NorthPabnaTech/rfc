'use client';

import * as React from 'react';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import { AreaTrend, BarSeries, Donut, Legend } from '@components/charts/charts';
import { useChartFormat } from '@components/charts/use-chart-format';
import { KpiCard, KpiGrid, Panel } from '@components/dashboard/panel';
import { RangeFilter, type RangeValue } from '@components/dashboard/range-filter';
import { Icon } from '@components/icon/icon';
import { PageHeader } from '@components/shared';
import { Select } from '@components/ui/select';
import {
  computeFinancials,
  dailySeries,
  monthlySeries,
  resolveRange,
} from '@lib/business/analytics';

export function BusinessAnalysis() {
  const i18n = useI18n();
  const { t, money, percent, locale } = i18n;
  const fmt = useChartFormat();
  const s = usePlatformStore();
  const [range, setRange] = React.useState<RangeValue>({ key: '30d' });
  const [category, setCategory] = React.useState('all');
  const [supplier, setSupplier] = React.useState('all');

  // Business filters narrow the orders; expenses stay platform-wide.
  const orders = React.useMemo(() => {
    if (category === 'all' && supplier === 'all') return s.orders;
    const ids = new Set(
      s.products
        .filter(
          (p) =>
            (category === 'all' || p.categoryId === category) &&
            (supplier === 'all' || p.supplierId === supplier),
        )
        .map((p) => p.id),
    );
    return s.orders.filter((o) => ids.has(o.productId));
  }, [s.orders, s.products, category, supplier]);

  const r = resolveRange(range.key, range.custom);
  const data = { orders, expenses: s.expenses, withdrawals: s.withdrawals };
  const fin = computeFinancials(data, r);
  const months = monthlySeries(data, 6);
  const days = dailySeries(orders, 14);
  const deliveryRate = fin.orders ? (fin.delivered / fin.orders) * 100 : 0;

  const profitSeries = [
    { key: 'platformProfit', label: t('admin.analysis.platformProfit') },
    { key: 'sellerProfit', label: t('admin.analysis.sellerProfit') },
  ];
  const revExp = [
    { key: 'revenue', label: t('admin.analysis.revenue') },
    { key: 'expenses', label: t('admin.analysis.expenses') },
  ];
  const perf = [
    { key: 'delivered', label: t('status.order.delivered') },
    { key: 'cancelled', label: t('status.order.cancelled') },
    { key: 'returned', label: t('status.order.returned') },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader title={t('admin.analysis.title')} description={t('admin.analysis.subtitle')} />

      <div className="bg-panel border-line flex flex-col gap-2 rounded-2xl border p-3 lg:flex-row lg:items-center">
        <span className="text-muted hidden items-center gap-1.5 px-2 text-[14px] font-semibold lg:flex">
          <Icon name="filter" size={16} />
          {t('common.filters')}
        </span>
        <RangeFilter value={range} onChange={setRange} />
        <Select
          size="md"
          className="lg:w-52"
          value={category}
          onValueChange={setCategory}
          items={[
            { value: 'all', label: t('admin.analysis.allCategories') },
            ...s.categories.map((c) => ({
              value: c.id,
              label: locale === 'bn' ? c.nameBn : c.name,
            })),
          ]}
          aria-label={t('common.category')}
        />
        <Select
          size="md"
          className="lg:w-52"
          value={supplier}
          onValueChange={setSupplier}
          items={[
            { value: 'all', label: t('admin.analysis.allSuppliers') },
            ...s.suppliers.map((x) => ({ value: x.id, label: x.name })),
          ]}
          aria-label={t('common.supplier')}
        />
        <span className="text-subtle px-2 text-xs lg:ml-auto">
          {t('admin.analysis.periodNote', { range: t(`range.${range.key}`) })}
        </span>
      </div>

      <KpiGrid>
        <KpiCard
          label={t('admin.analysis.productCost')}
          value={money(fin.productCost)}
          icon="packageOpen"
          tone="navy"
        />
        <KpiCard
          label={t('admin.analysis.revenue')}
          value={money(fin.revenue)}
          icon="trend"
          tone="brand"
        />
        <KpiCard
          label={t('admin.analysis.platformProfit')}
          value={money(fin.platformProfit)}
          icon="coin"
          tone="ok"
        />
        <KpiCard
          label={t('admin.analysis.sellerProfit')}
          value={money(fin.sellerProfit)}
          icon="moneyBag"
          tone="sun"
        />
        <KpiCard
          label={t('admin.analysis.deliveryCharges')}
          value={money(fin.deliveryCharges)}
          icon="shipping"
          tone="info"
        />
        <KpiCard
          label={t('admin.analysis.packagingCharges')}
          value={money(fin.packagingCharges)}
          icon="box"
          tone="violet"
        />
        <KpiCard
          label={t('admin.analysis.expenses')}
          value={money(fin.expenses)}
          icon="receipt"
          tone="danger"
        />
        <KpiCard
          label={t('admin.analysis.netProfit')}
          value={money(fin.netProfit)}
          icon="analytics"
          tone={fin.netProfit >= 0 ? 'ok' : 'danger'}
          hint={`${t('admin.analysis.deliveryRate')}: ${percent(deliveryRate)} · ${t('admin.analysis.avgOrder')}: ${money(fin.delivered ? fin.revenue / fin.delivered : 0)}`}
        />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title={t('admin.dashboard.revenueVsExpenses')}
          description={t('admin.dashboard.revenueVsExpensesDesc')}
          action={<Legend series={revExp} className="hidden sm:flex" />}
        >
          <Legend series={revExp} className="mb-3 sm:hidden" />
          <AreaTrend
            data={months}
            xKey="key"
            series={revExp}
            format={fmt.money}
            tickFormat={fmt.moneyTick}
            xTickFormat={fmt.monthLabel}
          />
        </Panel>
        <Panel
          title={t('admin.analysis.revenueSplit')}
          description={t('admin.analysis.revenueSplitDesc')}
        >
          <Donut
            data={[
              {
                key: 'cost',
                label: t('admin.analysis.productCost'),
                value: fin.productCost,
                color: 'var(--chart-3)',
              },
              {
                key: 'platform',
                label: t('admin.analysis.platformProfit'),
                value: fin.platformProfit,
                color: 'var(--chart-1)',
              },
              {
                key: 'seller',
                label: t('admin.analysis.sellerProfit'),
                value: fin.sellerProfit,
                color: 'var(--chart-2)',
              },
            ]}
            format={fmt.money}
            centerValue={money(fin.revenue, { compact: true })}
            centerLabel={t('admin.analysis.revenue')}
          />
          <Legend
            className="mt-3 justify-center"
            series={[
              { key: 'cost', label: t('admin.analysis.productCost'), color: 'var(--chart-3)' },
              {
                key: 'platform',
                label: t('admin.analysis.platformProfit'),
                color: 'var(--chart-1)',
              },
              { key: 'seller', label: t('admin.analysis.sellerProfit'), color: 'var(--chart-2)' },
            ]}
          />
          <p className="text-subtle mt-3 flex items-center justify-center gap-1.5 text-center text-[12.5px]">
            <Icon
              name={
                fin.productCost + fin.platformProfit + fin.sellerProfit === fin.revenue
                  ? 'checkCircle'
                  : 'alert'
              }
              size={14}
              className="text-[var(--status-ok-fg)]"
            />
            {t('admin.analysis.identity')}
          </p>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel
          title={t('admin.dashboard.profitSplit')}
          description={t('admin.dashboard.profitSplitDesc')}
        >
          <Legend series={profitSeries} className="mb-3" />
          <BarSeries
            data={months}
            xKey="key"
            series={profitSeries}
            format={fmt.money}
            tickFormat={fmt.moneyTick}
            xTickFormat={fmt.monthLabel}
          />
        </Panel>
        <Panel
          title={t('admin.analysis.dailySales')}
          description={t('admin.analysis.dailySalesDesc')}
        >
          <AreaTrend
            data={days}
            xKey="date"
            series={[{ key: 'sales', label: t('admin.analysis.dailySales') }]}
            format={fmt.money}
            tickFormat={fmt.moneyTick}
            xTickFormat={fmt.dayLabel}
          />
        </Panel>
        <Panel
          title={t('admin.analysis.monthlyProfit')}
          description={t('admin.analysis.monthlyProfitDesc')}
        >
          <BarSeries
            data={months}
            xKey="key"
            series={[
              { key: 'netProfit', label: t('admin.analysis.netProfit'), color: 'var(--chart-1)' },
            ]}
            format={fmt.money}
            tickFormat={fmt.moneyTick}
            xTickFormat={fmt.monthLabel}
          />
        </Panel>
        <Panel
          title={t('admin.analysis.orderPerformance')}
          description={t('admin.analysis.orderPerformanceDesc')}
        >
          <Legend series={perf} className="mb-3" />
          <BarSeries
            data={months}
            xKey="key"
            series={perf}
            stacked
            format={fmt.count}
            tickFormat={fmt.count}
            xTickFormat={fmt.monthLabel}
            height={236}
          />
        </Panel>
      </div>
    </div>
  );
}
