'use client';

import * as React from 'react';

import type { BusinessDTO, Paginated, StockMovementDTO } from '@/types';
import { EmptyState, StatusBadge } from '@components/shared';
import { type Column, DataTable } from '@components/ui/data-table';
import { DEFAULT_BUSINESS_SLUG, STOCK_MOVEMENT_LABELS } from '@lib/constants';
import { cn, formatStoreDateTime } from '@lib/utils';

import { useUrlPagination } from '../../components/list-toolbar';
import { ProductPicker } from '../../components/product-picker';
import { StockAdjustDialog } from '../../components/stock-adjust-dialog';

export function InventoryView({
  data,
  businesses,
}: {
  data: Paginated<StockMovementDTO>;
  businesses: BusinessDTO[];
}) {
  const { onPaginate } = useUrlPagination();
  const [selected, setSelected] = React.useState<{
    id: string;
    name: string;
    stockQuantity: number;
  } | null>(null);

  const bizMap = React.useMemo(
    () => new Map(businesses.map((b) => [b.slug, b.name])),
    [businesses],
  );

  const columns: Column<StockMovementDTO>[] = [
    {
      key: 'product',
      wrap: true,
      minWidth: 220,
      header: 'Product',
      cell: (m) => (
        <div>
          <p className="text-ink font-semibold">{m.productName}</p>
          <p className="text-subtle text-[11.5px]">
            {bizMap.get(m.business) ?? m.business}
            {m.orderNumber ? ` · Order ${m.orderNumber}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Movement',
      cell: (m) => {
        const isPositive =
          m.type === 'stock_in' || m.type === 'order_cancel' || m.type === 'order_return';
        return (
          <StatusBadge
            status={isPositive ? 'ok' : m.type === 'stock_out' ? 'danger' : 'warn'}
            label={STOCK_MOVEMENT_LABELS[m.type]}
          />
        );
      },
    },
    {
      key: 'change',
      header: 'Change',
      align: 'right',
      cell: (m) => {
        const isPositive =
          m.type === 'stock_in' || m.type === 'order_cancel' || m.type === 'order_return';
        return (
          <span
            className={cn(
              'font-semibold tabular-nums',
              isPositive ? 'text-emerald-600' : 'text-rose-600',
            )}
          >
            {isPositive ? '+' : '-'}
            {m.quantity}
          </span>
        );
      },
    },
    {
      key: 'balance',
      header: 'Stock (Before → After)',
      align: 'right',
      cell: (m) => (
        <span className="text-muted tabular-nums">
          {m.previousQuantity} → <strong className="text-ink">{m.newQuantity}</strong>
        </span>
      ),
    },
    {
      key: 'reason',
      wrap: true,
      minWidth: 160,
      header: 'Reason / Notes',
      cell: (m) => (
        <div>
          <p className="text-ink text-[12.5px]">{m.reason ?? '—'}</p>
          {m.notes && <p className="text-subtle text-[11px]">{m.notes}</p>}
        </div>
      ),
    },
    {
      key: 'by',
      header: 'Admin',
      cell: (m) => <span className="text-muted text-[12.5px]">{m.performedByName ?? 'System'}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      cell: (m) => <span className="text-muted text-[12.5px]">{formatStoreDateTime(m.date)}</span>,
    },
  ];

  return (
    <>
      <div className="mb-4 flex justify-end">
        <ProductPicker
          label="Adjust product stock"
          singlesOnly
          allowOutOfStock
          onPick={(line) =>
            setSelected({
              id: line.product.id,
              name: line.product.name,
              stockQuantity: line.product.stockQuantity,
            })
          }
        />
      </div>

      {data.items.length === 0 ? (
        <EmptyState
          title="No stock movements yet"
          description="Stock In, Stock Out, and order-related inventory adjustments will appear here."
        />
      ) : (
        <DataTable
          columns={columns}
          source={data.items}
          rowKey="id"
          page={data.page}
          limit={data.pageSize}
          total={data.total}
          onPaginate={onPaginate}
        />
      )}

      {selected && (
        <StockAdjustDialog product={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

void DEFAULT_BUSINESS_SLUG;
