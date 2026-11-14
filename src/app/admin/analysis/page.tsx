import type { Metadata } from 'next';

import { getAnalysisDashboard } from '@/services/analytics';
import { listBusinesses } from '@/services/businesses';
import type { AnalysisPeriod } from '@/types';
import { PageHeader, StatCard, StatCardGrid } from '@components/shared';
import { param, type SearchParams } from '@lib/search-params';
import { cn, formatNumber } from '@lib/utils';

import {
  ExpenseCategoryBreakdown,
  OrderStatusBreakdown,
  ProfitTrendChart,
  RevenueExpensesChart,
} from './components/analysis-charts';
import { AnalysisFilters } from './components/analysis-filters';

export const metadata: Metadata = { title: 'Business Analysis' };

const VALID_PERIODS: AnalysisPeriod[] = ['today', 'week', 'month', 'year', 'date', 'custom'];

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const rawPeriod = param(sp, 'period');
  const period: AnalysisPeriod =
    VALID_PERIODS.find((p) => p === rawPeriod) ?? 'month';
  const date = param(sp, 'date');
  const from = param(sp, 'from');
  const to = param(sp, 'to');
  const business = param(sp, 'business') ?? 'all';

  const [data, businesses] = await Promise.all([
    getAnalysisDashboard({ period, date, from, to, business }),
    listBusinesses(),
  ]);

  const s = data.summary;

  return (
    <>
      <PageHeader
        title="Business Analysis"
        description={`Financial performance & P&L (${data.range.from} to ${data.range.to})`}
      />

      <AnalysisFilters
        period={period}
        date={date}
        from={data.range.from}
        to={data.range.to}
        business={business}
        businesses={businesses}
      />

      <StatCardGrid>
        <StatCard
          label="Net revenue"
          value={`৳${formatNumber(s.netRevenue)}`}
          hint={s.refunds > 0 ? `Gross ৳${formatNumber(s.grossRevenue)} - ৳${formatNumber(s.refunds)} refunds` : 'Excl. cancelled'}
          icon="coin"
        />
        <StatCard
          label="Product cost (COGS)"
          value={`৳${formatNumber(s.cogs)}`}
          hint={`Shipping ৳${formatNumber(s.shippingFees)}`}
          icon="box"
          tone="neutral"
        />
        <StatCard
          label="Gross profit"
          value={`৳${formatNumber(s.grossProfit)}`}
          hint="Net rev - shipping - COGS"
          icon="trend"
          tone={s.grossProfit >= 0 ? 'ok' : 'warn'}
        />
        <StatCard
          label="Operating expenses"
          value={`৳${formatNumber(s.operatingExpenses)}`}
          hint={
            s.supplierPurchaseExpenses > 0
              ? `+৳${formatNumber(s.supplierPurchaseExpenses)} stock purchases (excluded)`
              : 'Excl. COGS purchases'
          }
          icon="receipt"
          tone="warn"
        />
        <StatCard
          label="Net profit / loss"
          value={`৳${formatNumber(s.netProfit)}`}
          hint="Gross profit - op. expenses"
          icon="money"
          tone={s.netProfit >= 0 ? 'ok' : 'warn'}
        />
        <StatCard
          label="Average order value"
          value={`৳${formatNumber(s.averageOrderValue)}`}
          hint={`${s.totalOrders} total · ${s.completedOrders} completed`}
          icon="cart"
          tone="info"
        />
      </StatCardGrid>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniMetric label="Total orders" value={formatNumber(s.totalOrders)} />
        <MiniMetric label="Completed / Delivered" value={formatNumber(s.completedOrders)} tone="ok" />
        <MiniMetric label="Cancelled orders" value={formatNumber(s.cancelledOrders)} tone="danger" />
        <MiniMetric label="Returned orders" value={formatNumber(s.returnedOrders)} tone="warn" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="bg-panel hairline rounded-xl2 p-5">
          <div className="mb-4">
            <h2 className="text-ink text-[14px] font-semibold">Revenue vs Expenses & COGS</h2>
            <p className="text-subtle text-[12px]">
              Grouped by {data.range.granularity === 'month' ? 'month' : 'day'} (Asia/Dhaka)
            </p>
          </div>
          <RevenueExpensesChart data={data.timeline} />
        </section>

        <section className="bg-panel hairline rounded-xl2 space-y-6 p-5">
          <div>
            <h2 className="text-ink text-[14px] font-semibold">Profit & Loss Trend</h2>
            <p className="text-subtle mb-3 text-[12px]">Net daily/monthly profit above or below zero</p>
            <ProfitTrendChart data={data.timeline} />
          </div>
          <div className="border-line border-t pt-5">
            <h2 className="text-ink mb-3 text-[14px] font-semibold">Business Breakdown</h2>
            <div className="space-y-2.5">
              {data.businessBreakdown.map((b) => (
                <div
                  key={b.slug}
                  className="bg-surface flex items-center justify-between rounded-lg px-3 py-2 text-[12.5px]"
                >
                  <div>
                    <p className="text-ink font-semibold">{b.name}</p>
                    <p className="text-subtle text-[11px]">{b.orders} valid orders</p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="text-ink font-semibold">৳{formatNumber(b.revenue)}</p>
                    <p
                      className={cn(
                        'text-[11px] font-medium',
                        b.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600',
                      )}
                    >
                      Net ৳{formatNumber(b.netProfit)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="bg-panel hairline rounded-xl2 p-5">
          <h2 className="text-ink mb-4 text-[14px] font-semibold">Order Statistics</h2>
          <OrderStatusBreakdown rows={data.ordersByStatus} />
        </section>
        <section className="bg-panel hairline rounded-xl2 p-5">
          <h2 className="text-ink mb-4 text-[14px] font-semibold">Expense Category Breakdown</h2>
          <ExpenseCategoryBreakdown rows={data.expenseByCategory} />
        </section>
      </div>
    </>
  );
}

function MiniMetric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'ok' | 'warn' | 'danger';
}) {
  return (
    <div className="bg-panel hairline rounded-xl2 px-4 py-3">
      <p className="text-subtle text-[11.5px]">{label}</p>
      <p
        className={cn(
          'mt-1 text-xl font-semibold tabular-nums',
          tone === 'ok'
            ? 'text-emerald-600'
            : tone === 'warn'
              ? 'text-amber-600'
              : tone === 'danger'
                ? 'text-rose-600'
                : 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  );
}
