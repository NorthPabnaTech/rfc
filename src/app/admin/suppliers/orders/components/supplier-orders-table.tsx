'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';

import { refreshSupplierOrderStatusAction } from '@/actions/admin';
import { Taka } from '@/features/products/price';
import type { Paginated, SupplierOrderDTO } from '@/types';
import { Icon } from '@components/icon/icon';
import { StatusBadge } from '@components/shared';
import { Button } from '@components/ui/button';
import { type Column, DataTable } from '@components/ui/data-table';
import { SUPPLIER_ORDER_STATUS_LABELS, type SupplierOrderStatus } from '@lib/constants';
import { toast } from '@lib/toast';
import { formatStoreDateTime } from '@lib/utils';

import { useUrlPagination } from '../../../components/list-toolbar';

function statusTone(status: SupplierOrderStatus): 'ok' | 'warn' | 'danger' | 'neutral' | 'info' {
  switch (status) {
    case 'delivered':
    case 'shipped':
      return 'ok';
    case 'submitted':
    case 'processing':
      return 'info';
    case 'awaiting_confirmation':
    case 'pending_payment':
      return 'warn';
    case 'failed':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function SupplierOrdersTable({ data }: { data: Paginated<SupplierOrderDTO> }) {
  const router = useRouter();
  const { onPaginate } = useUrlPagination();
  const [refreshingId, setRefreshingId] = React.useState<string | null>(null);

  const handleRefresh = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setRefreshingId(id);
    const res = await refreshSupplierOrderStatusAction(id);
    setRefreshingId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success('Supplier order status refreshed');
    router.refresh();
  };

  const columns: Column<SupplierOrderDTO>[] = [
    {
      key: 'order',
      header: 'Local Order',
      cell: (o) => (
        <div>
          <Link
            href={`/admin/orders/${o.orderId}`}
            onClick={(e) => e.stopPropagation()}
            className="text-ink hover:text-accent font-semibold"
          >
            {o.orderNumber}
          </Link>
          <p className="text-subtle text-[11.5px]">{formatStoreDateTime(o.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'supplier',
      wrap: true,
      minWidth: 180,
      header: 'Supplier & Product',
      cell: (o) => (
        <div>
          <p className="text-ink font-medium">{o.productName}</p>
          <p className="text-subtle text-[11.5px]">
            {o.supplierName}
            {o.variantLabel ? ` · ${o.variantLabel}` : ''}
            {o.externalOrderId ? ` · Ext: ${o.externalOrderId}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'customer',
      wrap: true,
      minWidth: 150,
      header: 'Customer',
      cell: (o) => (
        <div>
          <p className="text-ink">{o.customer.name}</p>
          <p className="text-subtle text-[11.5px]">
            {o.customer.phone} · {o.customer.district}
          </p>
        </div>
      ),
    },
    {
      key: 'profit',
      header: 'Sell / Profit',
      align: 'right',
      cell: (o) => (
        <div className="text-right">
          <Taka amount={o.sellingPrice} className="text-ink font-semibold" />
          <p className="text-[11px] text-[var(--status-ok-fg)]">
            Profit: <Taka amount={o.expectedProfit} />
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (o) => (
        <div className="space-y-0.5">
          <StatusBadge
            status={statusTone(o.status)}
            label={SUPPLIER_ORDER_STATUS_LABELS[o.status]}
          />
          {o.externalStatus && (
            <p className="text-subtle text-[11px]">{o.externalStatus}</p>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      align: 'right',
      width: 140,
      cell: (o) => (
        <div className="flex justify-end gap-1">
          {o.externalOrderId && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Refresh status"
              disabled={refreshingId === o.id}
              onClick={(e) => void handleRefresh(e, o.id)}
            >
              <Icon
                name="refresh"
                size={14}
                className={refreshingId === o.id ? 'animate-spin' : undefined}
              />
            </Button>
          )}
          <Button asChild size="sm" variant="secondary">
            <Link href={`/admin/orders/${o.orderId}`} onClick={(e) => e.stopPropagation()}>
              {o.status === 'awaiting_confirmation' || o.status === 'failed'
                ? 'Review & Send'
                : 'View'}
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      source={data.items}
      rowKey="id"
      onRowClick={(o) => router.push(`/admin/orders/${o.orderId}`)}
      page={data.page}
      limit={data.pageSize}
      total={data.total}
      onPaginate={onPaginate}
      empty={{
        title: 'No supplier orders yet',
        description:
          'When customers order products linked to API-connected suppliers, they will appear here awaiting your confirmation.',
      }}
    />
  );
}
