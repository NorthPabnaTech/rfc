'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { OrderStatusBadge } from '@/features/orders/order-ui';
import { Taka } from '@/features/products/price';
import type { OrderRowDTO, Paginated } from '@/types';
import { type Column, DataTable } from '@components/ui/data-table';
import { ORDER_PLATFORM_LABELS } from '@lib/constants';
import { formatStoreDateTime } from '@lib/utils';

import { useUrlPagination } from '../../components/list-toolbar';

export function OrdersTable({ data }: { data: Paginated<OrderRowDTO> }) {
  const router = useRouter();
  const { onPaginate } = useUrlPagination();

  const columns: Column<OrderRowDTO>[] = [
    {
      key: 'order',
      header: 'Order',
      cell: (o) => (
        <div>
          <Link
            href={`/admin/orders/${o.id}`}
            className="text-ink hover:text-accent font-semibold"
            onClick={(e) => e.stopPropagation()}
          >
            {o.orderNumber}
          </Link>
          <p className="text-subtle text-[11.5px]">{formatStoreDateTime(o.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      wrap: true,
      minWidth: 170,
      header: 'Customer',
      cell: (o) => (
        <div>
          <p className="text-ink">{o.customer.name}</p>
          <p className="text-subtle text-[11.5px]">
            {o.customer.phone} · {o.city}
          </p>
        </div>
      ),
    },
    {
      key: 'platform',
      header: 'Platform',
      cell: (o) => <span className="text-muted">{ORDER_PLATFORM_LABELS[o.platform]}</span>,
    },
    { key: 'items', header: 'Items', align: 'right', cell: (o) => o.itemCount },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      cell: (o) => <Taka amount={o.total} className="text-ink font-semibold" />,
    },
    { key: 'status', header: 'Status', cell: (o) => <OrderStatusBadge status={o.status} /> },
    {
      key: 'payment',
      header: 'Payment',
      cell: (o) => (
        <span className={o.paymentStatus === 'paid' ? 'text-[var(--status-ok-fg)]' : 'text-muted'}>
          {o.paymentStatus === 'paid'
            ? 'Paid'
            : o.paymentStatus === 'refunded'
              ? 'Refunded'
              : 'COD due'}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      source={data.items}
      rowKey="id"
      onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
      page={data.page}
      limit={data.pageSize}
      total={data.total}
      onPaginate={onPaginate}
      empty={{
        title: 'No orders found',
        description: 'Try a different filter or create a manual order.',
      }}
    />
  );
}
