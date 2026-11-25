import type { Metadata } from 'next';

import { countOrdersByStatus, listAdminOrders } from '@/services/orders';
import { PageHeader } from '@components/shared';
import { requireAdminPage } from '@lib/auth/current-user';
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from '@lib/constants';
import { pageParam, param, type SearchParams } from '@lib/search-params';

import { ListToolbar } from '../../components/list-toolbar';
import { OrdersTable } from '../../orders/components/orders-table';
import { StatusTabs } from '../../orders/components/status-tabs';

export const metadata: Metadata = { title: 'Reseller Orders' };

export default async function AdminResellerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const status = ORDER_STATUSES.find((s) => s === param(sp, 'status'));
  const [data, counts] = await Promise.all([
    listAdminOrders({
      q: param(sp, 'q'),
      status,
      platform: 'reseller',
      from: param(sp, 'from'),
      to: param(sp, 'to'),
      page: pageParam(sp),
    }),
    countOrdersByStatus('reseller'),
  ]);

  return (
    <>
      <PageHeader
        title="Reseller Orders"
        description="Orders placed by resellers for their customers."
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
        ]}
      />
      <OrdersTable data={data} />
    </>
  );
}
