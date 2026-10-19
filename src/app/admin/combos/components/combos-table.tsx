'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { deleteProductAction } from '@/actions/admin';
import { Taka } from '@/features/products/price';
import { ProductImage } from '@/features/products/product-image';
import type { AdminComboDTO } from '@/types';
import { Icon } from '@components/icon/icon';
import { ConfirmDialog, StatusBadge } from '@components/shared';
import { Button } from '@components/ui/button';
import { type Column, DataTable } from '@components/ui/data-table';
import { useClientPagination } from '@hooks/use-client-pagination';
import { handleActionResult } from '@lib/action-client';
import { STOCK_STATUS_LABELS } from '@lib/constants';

export function CombosTable({ combos }: { combos: AdminComboDTO[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = React.useState<AdminComboDTO | null>(null);
  const paged = useClientPagination(combos);

  const columns: Column<AdminComboDTO>[] = [
    {
      key: 'combo',
      wrap: true,
      minWidth: 280,
      header: 'Combo',
      cell: (c) => (
        <div className="flex items-center gap-3">
          <span className="bg-well relative size-11 shrink-0 overflow-hidden rounded-lg">
            <ProductImage src={c.images[0]?.url} alt="" fill sizes="44px" />
          </span>
          <div className="min-w-0">
            <Link
              href={`/admin/combos/${c.id}/edit`}
              className="text-ink hover:text-accent line-clamp-2 font-semibold"
            >
              {c.name}
            </Link>
            <p className="text-subtle line-clamp-2 text-[11.5px]">
              {c.items.map((i) => `${i.quantity}× ${i.name}`).join(' · ')}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Combo price',
      align: 'right',
      cell: (c) => (
        <div>
          <Taka amount={c.comboPrice} className="text-ink font-semibold" />
          <p className="text-subtle text-[11px]">
            Separately <Taka amount={c.regularPrice} />
          </p>
        </div>
      ),
    },
    {
      key: 'margin',
      header: 'Margin',
      align: 'right',
      cell: (c) => <Taka amount={c.comboPrice - c.supplierPrice} />,
    },
    {
      key: 'stock',
      header: 'Stock',
      cell: (c) => (
        <StatusBadge
          status={c.stockStatus === 'out_of_stock' ? 'danger' : 'ok'}
          label={STOCK_STATUS_LABELS[c.stockStatus]}
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (c) => (
        <StatusBadge
          status={c.status === 'published' ? 'ok' : 'neutral'}
          label={c.status === 'published' ? 'Published' : 'Draft'}
        />
      ),
    },
    { key: 'sold', header: 'Sold', align: 'right', cell: (c) => c.soldCount },
    {
      key: 'actions',
      align: 'right',
      width: 96,
      cell: (c) => (
        <div className="flex justify-end gap-1">
          <Button size="icon-sm" variant="ghost" asChild aria-label={`Edit ${c.name}`}>
            <Link href={`/admin/combos/${c.id}/edit`}>
              <Icon name="pencil" size={15} />
            </Link>
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Delete ${c.name}`}
            onClick={() => setDeleting(c)}
          >
            <Icon name="trash" size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        {...paged}
        rowKey="id"
        empty={{
          title: 'No combo offers yet',
          description: 'Bundle 2 or more products at a special price.',
          action: (
            <Button variant="primary" asChild>
              <Link href="/admin/combos/new">
                <Icon name="plus" size={15} /> New combo
              </Link>
            </Button>
          ),
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        tone="danger"
        title={`Delete “${deleting?.name}”?`}
        description="Past orders keep their copy of this combo."
        confirmLabel="Delete combo"
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteProductAction(deleting.id);
          if (handleActionResult(res)) router.refresh();
        }}
      />
    </>
  );
}
