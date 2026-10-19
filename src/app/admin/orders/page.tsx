import type { Metadata } from 'next';
import Link from 'next/link';

import { countOrdersByStatus, listAdminOrders } from '@/services/orders';
import { Icon } from '@components/icon/icon';
import { PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { ORDER_PLATFORM_LABELS, ORDER_PLATFORMS, ORDER_STATUSES } from '@lib/constants';
import { pageParam, param, type SearchParams } from '@lib/search-params';

import { ListToolbar } from '../components/list-toolbar';
import { OrdersTable } from './components/orders-table';
import { StatusTabs } from './components/status-tabs';

export const metadata: Metadata = { title: 'Orders' };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const status = ORDER_STATUSES.find((s) => s === param(sp, 'status'));
  const platform = ORDER_PLATFORMS.find((p) => p === param(sp, 'platform'));
  const [data, counts] = await Promise.all([
    listAdminOrders({
      q: param(sp, 'q'),
      status,
      platform,
      from: param(sp, 'from'),
      to: param(sp, 'to'),
      page: pageParam(sp),
    }),
    countOrdersByStatus(),
  ]);

  return (
    <>
      <PageHeader
        title="Orders"
        description="Website orders and manual orders from social channels."
        actions={
          <Button variant="primary" asChild>
            <Link href="/admin/orders/new">
              <Icon name="plus" size={15} /> Create order
            </Link>
          </Button>
        }
      />
      <StatusTabs counts={counts} />
      <ListToolbar
        searchPlaceholder="Order #, customer name or phone…"
        filters={[
          {
            name: 'platform',
            label: 'Platforms',
            options: ORDER_PLATFORMS.map((p) => ({ value: p, label: ORDER_PLATFORM_LABELS[p] })),
          },
        ]}
      />
      <OrdersTable data={data} />
    </>
  );
}
