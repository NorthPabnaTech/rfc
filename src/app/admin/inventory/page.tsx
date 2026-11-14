import type { Metadata } from 'next';

import { listBusinesses } from '@/services/businesses';
import { listStockMovements } from '@/services/inventory';
import { PageHeader } from '@components/shared';
import { STOCK_MOVEMENT_LABELS, STOCK_MOVEMENT_TYPES } from '@lib/constants';
import { pageParam, param, type SearchParams } from '@lib/search-params';

import { ListToolbar } from '../components/list-toolbar';
import { InventoryView } from './components/inventory-view';

export const metadata: Metadata = { title: 'Inventory & Stock History' };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const type = STOCK_MOVEMENT_TYPES.find((t) => t === param(sp, 'type'));
  const [data, businesses] = await Promise.all([
    listStockMovements({
      q: param(sp, 'q'),
      business: param(sp, 'business'),
      type,
      page: pageParam(sp),
    }),
    listBusinesses(),
  ]);

  return (
    <>
      <PageHeader
        title="Inventory & Stock History"
        description="Complete audit log of manual Stock In / Stock Out and order inventory movements."
      />
      <ListToolbar
        searchPlaceholder="Search product, reason, or order #…"
        filters={[
          {
            name: 'business',
            label: 'Businesses',
            options: businesses.map((b) => ({ value: b.slug, label: b.name })),
          },
          {
            name: 'type',
            label: 'Movement',
            options: STOCK_MOVEMENT_TYPES.map((t) => ({
              value: t,
              label: STOCK_MOVEMENT_LABELS[t],
            })),
          },
        ]}
      />
      <InventoryView data={data} businesses={businesses} />
    </>
  );
}
