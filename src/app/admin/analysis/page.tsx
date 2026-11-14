import type { Metadata } from 'next';

import { getAnalysisDashboard } from '@/services/analytics';
import { listBusinesses } from '@/services/businesses';
import type { AnalysisPeriod } from '@/types';
import { PageHeader, StatCard, StatCardGrid } from '@components/shared';
import { param, type SearchParams } from '@lib/search-params';
import { formatNumber } from '@lib/utils';

import {
  OrdersPieChart,
  PlatformRevenueChart,
  ProfitLossLineChart,
  RevenueExpensesChart,
} from './components/analysis-charts';
import { AnalysisFilters } from './components/analysis-filters';

export const metadata: Metadata = { title: 'Business Analysis' };

const VALID_PERIODS: AnalysisPeriod[] = ['all', 'today', 'week', 'month', 'year', 'date', 'custom'];

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const rawPeriod = param(sp, 'period');
  const period: AnalysisPeriod = VALID_PERIODS.find((p) => p === rawPeriod) ?? 'all';
  const date = param(sp, 'date');
  const from = param(sp, 'from');
  const to = param(sp, 'to');
  const business = param(sp, 'business') ?? 'all';

  const [data, businesses] = await Promise.all([
    getAnalysisDashboard({ period, date, from, to, business }),
    listBusinesses(),
  ]);

  const s = data.summary;
  const totalCost = s.cogs + s.operatingExpenses + s.supplierPurchaseExpenses + s.shippingFees;
  const totalRevenue = s.netRevenue;
  const netAll = s.netProfit - s.supplierPurchaseExpenses;
  const totalProfit = Math.max(0, netAll);
  const totalLoss = Math.max(0, -netAll);

  return (
    <>
      <PageHeader
        title="Business Analysis"
        description={
          period === 'all'
            ? 'Financial performance & P&L (All time)'
            : `Financial performance & P&L (${data.range.from} to ${data.range.to})`
        }
        actions={
          <AnalysisFilters
            period={period}
            date={date}
            from={data.range.from}
            to={data.range.to}
            business={business}
            businesses={businesses}
          />
        }
      />

      <StatCardGrid>
        <StatCard
          label="Total Cost"
          value={`৳${formatNumber(totalCost)}`}
          icon="receipt"
          tone="neutral"
        />
        <StatCard
          label="Total Revenue"
          value={`৳${formatNumber(totalRevenue)}`}
          icon="coin"
          tone="info"
        />
        <StatCard
          label="Total Profit"
          value={`৳${formatNumber(totalProfit)}`}
          icon="trend"
          tone="ok"
        />
        <StatCard
          label="Total Loss"
          value={`৳${formatNumber(totalLoss)}`}
          icon="alert"
          tone={totalLoss > 0 ? 'danger' : 'neutral'}
        />
      </StatCardGrid>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="bg-panel hairline rounded-xl2 p-5">
          <div className="mb-4">
            <h2 className="text-ink text-[14px] font-semibold">Total Revenue vs Total Expenses</h2>
            <p className="text-subtle text-[12px]">
              Grouped by {data.range.granularity === 'month' ? 'month' : 'day'} (Asia/Dhaka)
            </p>
          </div>
          <RevenueExpensesChart data={data.timeline} />
        </section>

        <section className="bg-panel hairline rounded-xl2 p-5">
          <div className="mb-4">
            <h2 className="text-ink text-[14px] font-semibold">Total Profit vs Total Loss</h2>
            <p className="text-subtle text-[12px]">
              Line trend of profit and loss over the selected period
            </p>
          </div>
          <ProfitLossLineChart data={data.timeline} />
        </section>

        <section className="bg-panel hairline rounded-xl2 p-5">
          <div className="mb-4">
            <h2 className="text-ink text-[14px] font-semibold">Orders Breakdown</h2>
            <p className="text-subtle text-[12px]">
              Total orders, delivered, cancelled, and returned
            </p>
          </div>
          <OrdersPieChart
            totalOrders={s.totalOrders}
            completedOrders={s.completedOrders}
            cancelledOrders={s.cancelledOrders}
            returnedOrders={s.returnedOrders}
          />
        </section>

        <section className="bg-panel hairline rounded-xl2 p-5">
          <div className="mb-4">
            <h2 className="text-ink text-[14px] font-semibold">Sales by Platform</h2>
            <p className="text-subtle text-[12px]">
              Order volume and net revenue across sales channels
            </p>
          </div>
          <PlatformRevenueChart items={data.platformBreakdown ?? []} />
        </section>
      </div>
    </>
  );
}
