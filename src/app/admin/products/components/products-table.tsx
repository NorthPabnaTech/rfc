'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';

import {
  deleteProductAction,
  setProductFeaturedAction,
  setProductStockStatusAction,
} from '@/actions/admin';
import { Taka } from '@/features/products/price';
import { ProductImage } from '@/features/products/product-image';
import type { AdminProductRowDTO, BusinessDTO, Paginated } from '@/types';
import { Icon } from '@components/icon/icon';
import { ConfirmDialog, StatusBadge } from '@components/shared';
import { Button } from '@components/ui/button';
import { type Column, DataTable } from '@components/ui/data-table';
import { Dropdown } from '@components/ui/dropdown';
import { handleActionResult } from '@lib/action-client';
import { DEFAULT_BUSINESS_SLUG, STOCK_STATUS_LABELS } from '@lib/constants';
import { formatStoreDate } from '@lib/utils';

import { useUrlPagination } from '../../components/list-toolbar';

export function ProductsTable({
  data,
  businesses,
}: {
  data: Paginated<AdminProductRowDTO>;
  businesses: BusinessDTO[];
}) {
  const router = useRouter();
  const { onPaginate } = useUrlPagination();
  const [deleting, setDeleting] = React.useState<AdminProductRowDTO | null>(null);

  const bizMap = React.useMemo(
    () => new Map(businesses.map((b) => [b.slug, b.name])),
    [businesses],
  );

  const columns: Column<AdminProductRowDTO>[] = [
    {
      key: 'product',
      wrap: true,
      minWidth: 260,
      header: 'Product',
      cell: (p) => (
        <div className="flex items-center gap-3">
          <span className="relative size-11 shrink-0">
            <span className="bg-well relative block size-full overflow-hidden rounded-lg">
              <ProductImage src={p.image?.url} alt="" fill sizes="44px" />
            </span>
            {p.isFeatured && (
              <span
                title="Featured product"
                aria-label="Featured product"
                className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-amber-400 text-white shadow-xs ring-2 ring-white"
              >
                <Icon name="star" size={10} />
              </span>
            )}
          </span>
          <div className="min-w-0">
            <Link
              href={`/admin/products/${p.id}/edit`}
              className="text-ink hover:text-accent line-clamp-2 font-semibold"
            >
              {p.name}
            </Link>
            <p className="text-subtle text-[11.5px]">
              {p.sku ? `SKU ${p.sku} · ` : ''}
              {p.categoryName ?? 'Uncategorized'}
              {' · '}
              {bizMap.get(p.business) ?? p.business}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'supplier',
      wrap: true,
      minWidth: 120,
      header: 'Supplier',
      cell: (p) => <span className="text-muted">{p.supplierName ?? '—'}</span>,
    },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      cell: (p) => (
        <div>
          <Taka amount={p.effectivePrice} className="text-ink font-semibold" />
          {p.salePrice && (
            <Taka amount={p.price} className="text-subtle ml-1.5 text-[11px] line-through" />
          )}
          <p className="text-subtle text-[11px]">
            Cost <Taka amount={p.supplierPrice} /> · Margin{' '}
            <Taka amount={p.effectivePrice - p.supplierPrice} />
          </p>
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      cell: (p) => (
        <StatusBadge
          status={
            p.stockStatus === 'in_stock' ? 'ok' : p.stockStatus === 'pre_order' ? 'info' : 'danger'
          }
          label={STOCK_STATUS_LABELS[p.stockStatus]}
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (p) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge
            status={p.status === 'published' ? 'ok' : 'neutral'}
            label={p.status === 'published' ? 'Published' : 'Draft'}
          />
          {p.visibility === 'private' && <StatusBadge status="warn" label="Private" />}
        </div>
      ),
    },
    { key: 'sold', header: 'Sold', align: 'right', cell: (p) => p.soldCount },
    {
      key: 'updated',
      header: 'Updated',
      cell: (p) => <span className="text-muted">{formatStoreDate(p.updatedAt)}</span>,
    },
    {
      key: 'actions',
      align: 'right',
      width: 56,
      cell: (p) => (
        <Dropdown
          items={[
            {
              label: 'Edit',
              icon: 'pencil',
              onClick: () => router.push(`/admin/products/${p.id}/edit`),
            },
            ...(p.stockStatus !== 'in_stock'
              ? [
                  {
                    label: 'Stock In',
                    icon: 'plus' as const,
                    onClick: async () => {
                      const res = await setProductStockStatusAction(p.id, 'in_stock');
                      if (handleActionResult(res)) router.refresh();
                    },
                  },
                ]
              : []),
            ...(p.stockStatus !== 'out_of_stock'
              ? [
                  {
                    label: 'Stock Out',
                    icon: 'minus' as const,
                    onClick: async () => {
                      const res = await setProductStockStatusAction(p.id, 'out_of_stock');
                      if (handleActionResult(res)) router.refresh();
                    },
                  },
                ]
              : []),
            {
              label: p.isFeatured ? 'Remove from Featured' : 'Add to Featured',
              icon: 'star',
              onClick: async () => {
                const res = await setProductFeaturedAction(p.id, !p.isFeatured);
                if (handleActionResult(res)) router.refresh();
              },
            },
            ...(p.status === 'published' &&
            p.visibility !== 'private' &&
            p.business === DEFAULT_BUSINESS_SLUG
              ? [
                  {
                    label: 'View in store',
                    icon: 'external' as const,
                    onClick: () => window.open(`/products/${p.slug}`, '_blank'),
                  },
                ]
              : []),
            { type: 'separator' as const },
            { label: 'Delete', icon: 'trash', destructive: true, onClick: () => setDeleting(p) },
          ]}
        >
          <Button variant="ghost" size="icon-sm" aria-label="Actions">
            <Icon name="more" size={16} />
          </Button>
        </Dropdown>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        source={data.items}
        rowKey="id"
        page={data.page}
        limit={data.pageSize}
        total={data.total}
        onPaginate={onPaginate}
        empty={{
          title: 'No products found',
          description: 'Add your first product from a supplier site.',
          action: (
            <Button variant="primary" asChild>
              <Link href="/admin/products/new">
                <Icon name="plus" size={15} /> Add product
              </Link>
            </Button>
          ),
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        tone="danger"
        title="Delete this product?"
        description={`“${deleting?.name}” and its reviews and uploaded images will be permanently deleted. Past orders keep their copy of the product.`}
        confirmLabel="Delete product"
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteProductAction(deleting.id);
          if (handleActionResult(res)) router.refresh();
        }}
      />
    </>
  );
}
