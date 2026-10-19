import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { OrderStatusBadge } from '@/features/orders/order-ui';
import { Taka } from '@/features/products/price';
import { listCustomerOrders } from '@/services/orders';
import { getCustomerDetail } from '@/services/users';
import { PageHeader, StatCard, StatCardGrid } from '@components/shared';
import { SHIPPING_ZONE_LABELS } from '@lib/constants';
import { formatStoreDate, formatStoreDateTime } from '@lib/utils';
import { objectId } from '@lib/validators/common';

import { CustomerStatusToggle } from './components/customer-status-toggle';

export const metadata: Metadata = { title: 'Customer' };

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!objectId.safeParse(id).success) notFound();
  const [customer, orders] = await Promise.all([getCustomerDetail(id), listCustomerOrders(id)]);
  if (!customer) notFound();

  return (
    <>
      <PageHeader
        title={customer.name}
        description={`${customer.email}${customer.phone ? ` · ${customer.phone}` : ''}`}
        backHref="/admin/customers"
        backLabel="Customers"
        actions={<CustomerStatusToggle id={customer.id} active={customer.isActive} />}
      />
      <StatCardGrid>
        <StatCard label="Orders" value={customer.orderCount} icon="cart" />
        <StatCard
          label="Total spent"
          value={<Taka amount={customer.totalSpent} />}
          icon="coin"
          tone="ok"
        />
        <StatCard
          label="Customer since"
          value={formatStoreDate(customer.createdAt)}
          icon="calendar"
          tone="info"
        />
        <StatCard
          label="Last sign-in"
          value={customer.lastLoginAt ? formatStoreDate(customer.lastLoginAt) : '—'}
          icon="clock"
          tone="neutral"
        />
      </StatCardGrid>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="bg-panel hairline rounded-xl2 p-5">
          <h2 className="text-ink mb-3 text-[14px] font-semibold">Order history</h2>
          {orders.length === 0 ? (
            <p className="text-muted text-sm">No orders yet.</p>
          ) : (
            <ul className="divide-line divide-y">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="hover:bg-well -mx-2 flex flex-wrap items-center gap-4 rounded-lg px-2 py-3"
                  >
                    <span className="text-ink w-28 font-semibold">{o.orderNumber}</span>
                    <span className="text-muted w-40 text-sm">
                      {formatStoreDateTime(o.createdAt)}
                    </span>
                    <OrderStatusBadge status={o.status} />
                    <Taka amount={o.total} className="text-ink ml-auto font-semibold" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="bg-panel hairline rounded-xl2 p-5">
          <h2 className="text-ink mb-3 text-[14px] font-semibold">Saved addresses</h2>
          {customer.addresses.length === 0 ? (
            <p className="text-muted text-sm">None saved.</p>
          ) : (
            <ul className="space-y-3">
              {customer.addresses.map((a) => (
                <li key={a.id} className="bg-surface rounded-xl p-3 text-sm">
                  <p className="text-ink font-semibold">
                    {a.label}{' '}
                    {a.isDefault && <span className="text-accent text-xs">· Default</span>}
                  </p>
                  <p className="text-base-700 mt-1">
                    {a.fullName}, {a.phone}
                    <br />
                    {a.addressLine}, {[a.area, a.city].filter(Boolean).join(', ')}
                    <br />
                    <span className="text-muted">{SHIPPING_ZONE_LABELS[a.zone]}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
