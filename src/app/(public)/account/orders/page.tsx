import type { Metadata } from 'next';
import Link from 'next/link';

import { OrderStatusBadge } from '@/features/orders/order-ui';
import { Taka } from '@/features/products/price';
import { listCustomerOrders } from '@/services/orders';
import { Icon } from '@components/icon/icon';
import { EmptyState } from '@components/shared';
import { Button } from '@components/ui/button';
import { requireUserPage } from '@lib/auth/current-user';
import { formatStoreDate } from '@lib/utils';

export const metadata: Metadata = { title: 'My orders' };

export default async function MyOrdersPage() {
  const user = await requireUserPage('/account/orders');
  const orders = await listCustomerOrders(user.id);

  return (
    <section className="border-line rounded-3xl border bg-white p-6 sm:p-8">
      <h2 className="text-ink text-lg font-semibold">Order history</h2>
      {orders.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="No orders yet"
          description="When you place an order it will appear here."
          action={
            <Button variant="noir" asChild>
              <Link href="/products">Start shopping</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-line mt-4 divide-y">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/account/orders/${o.id}`}
                className="group hover:bg-surface -mx-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl px-3 py-4"
              >
                <div className="min-w-[140px]">
                  <p className="text-ink font-semibold">{o.orderNumber}</p>
                  <p className="text-muted text-xs">{formatStoreDate(o.createdAt)}</p>
                </div>
                <OrderStatusBadge status={o.status} />
                <p className="text-muted text-sm">
                  {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}
                </p>
                <Taka amount={o.total} className="text-ink ml-auto font-bold" />
                <Icon name="chevRight" size={16} className="text-subtle group-hover:text-ink" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
