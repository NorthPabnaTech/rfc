'use client';

import * as React from 'react';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import { BarSeries, Legend } from '@components/charts/charts';
import { useChartFormat } from '@components/charts/use-chart-format';
import { KpiCard, KpiGrid, Panel } from '@components/dashboard/panel';
import { RangeFilter, type RangeValue } from '@components/dashboard/range-filter';
import { Money } from '@components/platform/money';
import { PageHeader } from '@components/shared';
import { computeFinancials, monthlySeries, resolveRange } from '@lib/business/analytics';
import { cn } from '@lib/utils';

export default function PlatformRevenuePage() {
  const { t, money } = useI18n();
  const fmt = useChartFormat();
  const s = usePlatformStore();
  const [range, setRange] = React.useState<RangeValue>({ key: 'all' });
  const fin = computeFinancials(s, resolveRange(range.key, range.custom));
  const months = monthlySeries(s, 6);
  const series = [
    { key: 'platformIncome', label: t('admin.dashboard.income') },
    { key: 'expenses', label: t('admin.analysis.expenses') },
    { key: 'netProfit', label: t('admin.analysis.netProfit') },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('admin.finance.revenueTitle')}
        description={t('admin.finance.revenueSubtitle')}

        actions={<RangeFilter value={range} onChange={setRange} />}
      />
      <KpiGrid>
        <KpiCard
          label={t('admin.finance.supplierCosts')}
          value={money(fin.productCost)}
          icon="packageOpen"
          tone="navy"
        />
        <KpiCard
          label={t('admin.analysis.platformProfit')}
          value={money(fin.platformProfit)}
          icon="coin"
          tone="ok"
        />
        <KpiCard
          label={t('nav.sellerEarnings')}
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
          label={t('admin.finance.withdrawalCharges')}
          value={money(fin.withdrawalFees)}
          icon="moneySend"
          tone="brand"
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
        />
      </KpiGrid>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title={t('admin.finance.incomeStatement')} description={t(`range.${range.key}`)}>
          <Line label={t('admin.finance.grossRevenue')} value={fin.revenue} />
          <Line
            label={t('admin.finance.paidToSuppliers')}
            value={-fin.productCost}
            sign="−"
            muted
          />
          <Line label={t('admin.finance.paidToSellers')} value={-fin.sellerProfit} sign="−" muted />
          <Line label={t('admin.finance.platformMargin')} value={fin.platformProfit} sign="=" />
          <div className="text-subtle pt-2 text-[11px] font-bold tracking-wider uppercase">
            {t('admin.finance.otherIncome')}
          </div>
          <Line
            label={t('admin.analysis.deliveryCharges')}
            value={fin.deliveryCharges}
            sign="+"
            muted
          />
          <Line
            label={t('admin.analysis.packagingCharges')}
            value={fin.packagingCharges}
            sign="+"
            muted
          />
          <Line
            label={t('admin.finance.withdrawalCharges')}
            value={fin.withdrawalFees}
            sign="+"
            muted
          />
          <Line label={t('admin.finance.operatingExpenses')} value={-fin.expenses} sign="−" muted />
          <Line label={t('admin.analysis.netProfit')} value={fin.netProfit} strong />
        </Panel>
        <Panel
          title={t('admin.dashboard.revenueVsExpenses')}
          description={t('admin.dashboard.revenueVsExpensesDesc')}
        >
          <Legend series={series} className="mb-3" />
          <BarSeries
            data={months}
            xKey="key"
            series={series}
            format={fmt.money}
            tickFormat={fmt.moneyTick}
            xTickFormat={fmt.monthLabel}
            height={320}
          />
        </Panel>
      </div>
    </div>
  );
}

const Line = ({
  label,
  value,
  sign,
  strong,
  muted,
}: {
  label: string;
  value: number;
  sign?: '+' | '−' | '=';
  strong?: boolean;
  muted?: boolean;
}) => (
  <div
    className={cn(
      'flex items-center justify-between gap-4 py-2.5 text-[13.5px]',
      strong && 'border-line border-t-2 pt-3',
    )}
  >
    <span className={cn(muted ? 'text-muted pl-4' : 'text-ink', strong && 'font-bold')}>
      {sign && <span className="text-subtle mr-2 inline-block w-3">{sign}</span>}
      {label}
    </span>
    <Money
      value={value}
      className={cn(
        strong ? 'text-lg font-extrabold' : 'font-semibold',
        muted && 'text-muted',
        strong && (value >= 0 ? 'text-[var(--status-ok-fg)]' : 'text-[var(--status-danger-fg)]'),
      )}
    />
  </div>
);
