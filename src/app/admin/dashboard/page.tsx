import type { Metadata } from 'next';
import Link from 'next/link';

import { OrderStatusBadge } from '@/features/orders/order-ui';
import { Taka } from '@/features/products/price';
import { ProductImage } from '@/features/products/product-image';
import { getDashboardData } from '@/services/dashboard';
import { PageHeader, StatCard, StatCardGrid } from '@components/shared';
import {
  ORDER_PLATFORM_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  type OrderPlatform,
} from '@lib/constants';
import { formatNumber, formatStoreDateTime } from '@lib/utils';

import { BarList, RevenueChart } from './components/revenue-chart';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const d = await getDashboardData(30);
  const last30 = d.revenueByDay.reduce((s, x) => s + x.revenue, 0);
  const last30Orders = d.revenueByDay.reduce((s, x) => s + x.orders, 0);

  return (
    <>
      <PageHeader title="Dashboard" description="Your store at a glance." />

      <StatCardGrid>
        <StatCard
          label="Total sales"
          value={`৳${formatNumber(d.totals.sales)}`}
          hint="Excl. cancelled"
          icon="coin"
        />
        <StatCard
          label="Total orders"
          value={formatNumber(d.totals.orders)}
          icon="cart"
          tone="info"
        />
        <StatCard
          label="Pending orders"
          value={d.totals.pendingOrders}
          hint="Need confirmation"
          icon="clock"
          tone="warn"
        />
        <StatCard
          label="Delivered orders"
          value={d.totals.deliveredOrders}
          icon="delivered"
          tone="ok"
        />
        <StatCard label="Products" value={d.totals.products} icon="box" tone="neutral" />
        <StatCard label="Customers" value={d.totals.customers} icon="users" tone="neutral" />
      </StatCardGrid>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="bg-panel hairline rounded-xl2 p-5">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-ink text-[14px] font-semibold">Revenue — last 30 days</h2>
              <p className="text-subtle text-[12px]">
                Daily order value, excluding cancelled and returned orders
              </p>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <p className="text-subtle text-[11px]">30-day revenue</p>
                <p className="text-ink text-lg font-semibold">৳{formatNumber(last30)}</p>
              </div>
              <div>
                <p className="text-subtle text-[11px]">30-day orders</p>
                <p className="text-ink text-lg font-semibold">{last30Orders}</p>
              </div>
            </div>
          </div>
          <RevenueChart data={d.revenueByDay} />
        </section>

        <section className="bg-panel hairline rounded-xl2 p-5">
          <h2 className="text-ink text-[14px] font-semibold">Profit (delivered orders)</h2>
          <p className="text-subtle text-[12px]">Sales minus delivery fees and supplier cost</p>
          <p className="text-ink mt-4 text-[34px] leading-none font-semibold">
            ৳{formatNumber(d.totals.profit)}
          </p>
          <p className="text-muted mt-2 text-[12.5px]">
            from ৳{formatNumber(d.totals.realizedSales)} collected
          </p>
          <div className="border-line mt-5 space-y-2 border-t pt-4 text-[13px]">
            <Link
              href="/admin/returns"
              className="hover:bg-well -mx-2 flex justify-between rounded-md px-2 py-1"
            >
              <span className="text-muted">Open returns</span>
              <span className="text-ink font-semibold">{d.totals.openReturns}</span>
            </Link>
            <Link
              href="/admin/questions?state=unanswered"
              className="hover:bg-well -mx-2 flex justify-between rounded-md px-2 py-1"
            >
              <span className="text-muted">Unanswered questions</span>
              <span className="text-ink font-semibold">{d.totals.unansweredQuestions}</span>
            </Link>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="bg-panel hairline rounded-xl2 p-5">
          <h2 className="text-ink mb-4 text-[14px] font-semibold">Orders by status</h2>
          <BarList
            rows={ORDER_STATUSES.filter((s) => d.byStatus[s]).map((s) => ({
              label: ORDER_STATUS_LABELS[s],
              value: d.byStatus[s] ?? 0,
            }))}
          />
        </section>
        <section className="bg-panel hairline rounded-xl2 p-5">
          <h2 className="text-ink mb-4 text-[14px] font-semibold">Orders by platform</h2>
          <BarList
            rows={d.byPlatform.map((p) => ({
              label: ORDER_PLATFORM_LABELS[p.platform as OrderPlatform] ?? p.platform,
              value: p.orders,
              hint: `৳${formatNumber(p.revenue)} revenue`,
            }))}
          />
        </section>
        <section className="bg-panel hairline rounded-xl2 p-5">
          <h2 className="text-ink mb-4 text-[14px] font-semibold">Top products</h2>
          {d.topProducts.length === 0 ? (
            <p className="text-muted text-sm">No sales yet.</p>
          ) : (
            <ol className="space-y-3">
              {d.topProducts.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3">
                  <span className="text-subtle w-4 text-[12px] font-semibold">{i + 1}</span>
                  <span className="bg-well relative size-10 shrink-0 overflow-hidden rounded-lg">
                    <ProductImage src={p.image} alt="" fill sizes="40px" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-ink line-clamp-1 text-[13px] font-medium">{p.name}</p>
                    <p className="text-subtle text-[11.5px]">{p.quantity} sold</p>
                  </div>
                  <Taka amount={p.revenue} className="text-ink text-[13px] font-semibold" />
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="bg-panel hairline rounded-xl2 mt-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-ink text-[14px] font-semibold">Recent orders</h2>
          <Link
            href="/admin/orders"
            className="text-accent text-[12.5px] font-semibold hover:underline"
          >
            View all →
          </Link>
        </div>
        {d.recentOrders.length === 0 ? (
          <p className="text-muted text-sm">No orders yet.</p>
        ) : (
          <ul className="divide-line divide-y">
            {d.recentOrders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="hover:bg-well -mx-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md px-2 py-2.5 text-[13px]"
                >
                  <span className="text-ink w-24 font-semibold">{o.orderNumber}</span>
                  <span className="text-ink min-w-32 flex-1">{o.customer.name}</span>
                  <span className="text-muted hidden w-24 sm:block">
                    {ORDER_PLATFORM_LABELS[o.platform]}
                  </span>
                  <span className="text-muted hidden w-40 md:block">
                    {formatStoreDateTime(o.createdAt)}
                  </span>
                  <OrderStatusBadge status={o.status} />
                  <Taka amount={o.total} className="text-ink w-24 text-right font-semibold" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
