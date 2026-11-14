import type { Metadata } from 'next';

import { listSuppliers } from '@/services/catalog';
import { listAllSupplierOrders } from '@/services/supplier-orders';
import { PageHeader } from '@components/shared';
import {
  SUPPLIER_ORDER_STATUS_LABELS,
  SUPPLIER_ORDER_STATUSES,
  type SupplierOrderStatus,
} from '@lib/constants';
import { pageParam, param, type SearchParams } from '@lib/search-params';

import { ListToolbar } from '../../components/list-toolbar';
import { SupplierOrdersTable } from './components/supplier-orders-table';

export const metadata: Metadata = { title: 'Supplier Orders' };

export default async function SupplierOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const statusParam = param(sp, 'status');
  const status = SUPPLIER_ORDER_STATUSES.find((s) => s === statusParam) as
    | SupplierOrderStatus
    | undefined;

  const [data, suppliers] = await Promise.all([
    listAllSupplierOrders({
      status,
      supplierId: param(sp, 'supplier'),
      q: param(sp, 'q'),
      page: pageParam(sp),
    }),
    listSuppliers(),
  ]);

  const apiSuppliers = suppliers.filter((s) => s.type === 'api');

  return (
    <>
      <PageHeader
        title="Supplier Orders"
        description="Review, confirm, and track dropshipping orders for API-connected suppliers."
        backHref="/admin/suppliers"
        backLabel="Suppliers"
      />
      <ListToolbar
        searchPlaceholder="Search order #, supplier order ID, product, or phone…"
        filters={[
          {
            name: 'status',
            label: 'All statuses',
            options: SUPPLIER_ORDER_STATUSES.map((s) => ({
              value: s,
              label: SUPPLIER_ORDER_STATUS_LABELS[s],
            })),
          },
          ...(apiSuppliers.length
            ? [
                {
                  name: 'supplier',
                  label: 'All suppliers',
                  options: apiSuppliers.map((s) => ({ value: s.id, label: s.name })),
                },
              ]
            : []),
        ]}
      />
      <SupplierOrdersTable data={data} />
    </>
  );
}
