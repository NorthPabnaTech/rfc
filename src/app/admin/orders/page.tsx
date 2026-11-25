import type { Metadata } from 'next';
import Link from 'next/link';

import { listBusinesses } from '@/services/businesses';
import { countOrdersByStatus, listAdminOrders } from '@/services/orders';
import { Icon } from '@components/icon/icon';
import { PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import {
  ORDER_PLATFORM_LABELS,
  ORDER_PLATFORMS,
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
} from '@lib/constants';
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
  const platform = ORDER_PLATFORMS.find((p) => p === param(sp, 'platform') && p !== 'reseller');
  const [data, counts, businesses] = await Promise.all([
    listAdminOrders({
      q: param(sp, 'q'),
      status,
      platform,
      excludeReseller: true,
      business: param(sp, 'business'),
      from: param(sp, 'from'),
      to: param(sp, 'to'),
      page: pageParam(sp),
    }),
    countOrdersByStatus('non_reseller'),
    listBusinesses(),
  ]);

  return (
    <>
      <PageHeader
        title="Orders"
        description="Website orders and manual orders from social channels."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" asChild>
              <Link href="/admin/suppliers/orders">
                <Icon name="store" size={15} /> Supplier Orders
              </Link>
            </Button>
            <Button variant="primary" asChild>
              <Link href="/admin/orders/new">
                <Icon name="plus" size={15} /> Create order
              </Link>
            </Button>
          </div>
        }
      />
      <StatusTabs counts={counts} />
      <ListToolbar
        searchPlaceholder="Order #, customer name or phone…"
        filters={[
          {
            name: 'status',
            label: 'Statuses',
            options: ORDER_STATUSES.filter((s) => s !== 'completed').map((s) => ({
              value: s,
              label: ORDER_STATUS_LABELS[s],
            })),
          },
          {
            name: 'business',
            label: 'Businesses',
            options: businesses.map((b) => ({ value: b.slug, label: b.name })),
          },
          {
            name: 'platform',
            label: 'Platforms',
            options: ORDER_PLATFORMS.filter((p) => p !== 'messenger' && p !== 'reseller').map((p) => ({
              value: p,
              label: ORDER_PLATFORM_LABELS[p],
            })),
          },
        ]}
      />
      <OrdersTable data={data} />
    </>
  );
}
