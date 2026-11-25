import type { Metadata } from 'next';
import Link from 'next/link';

import { listBusinesses } from '@/services/businesses';
import { listCategories, listSuppliers } from '@/services/catalog';
import { listAdminProducts } from '@/services/products';
import { Icon } from '@components/icon/icon';
import { PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { requireAdminPage } from '@lib/auth/current-user';
import {
  PRODUCT_STATUSES,
  PRODUCT_VISIBILITIES,
  STOCK_STATUS_LABELS,
  STOCK_STATUSES,
} from '@lib/constants';
import { pageParam, param, type SearchParams } from '@lib/search-params';

import { ListToolbar } from '../components/list-toolbar';
import { ProductsTable } from './components/products-table';

export const metadata: Metadata = { title: 'Products' };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const status = param(sp, 'status');
  const stock = param(sp, 'stock');
  const visibility = param(sp, 'visibility');
  const [data, categories, suppliers, businesses] = await Promise.all([
    listAdminProducts({
      q: param(sp, 'q'),
      category: param(sp, 'category'),
      supplier: param(sp, 'supplier'),
      business: param(sp, 'business'),
      visibility: PRODUCT_VISIBILITIES.find((v) => v === visibility),
      status: PRODUCT_STATUSES.find((s) => s === status),
      stockStatus: STOCK_STATUSES.find((s) => s === stock),
      page: pageParam(sp),
    }),
    listCategories(),
    listSuppliers(),
    listBusinesses(),
  ]);

  return (
    <>
      <PageHeader
        title="Products"
        description={`${data.total} products in your catalog`}
        actions={
          <Button variant="primary" asChild>
            <Link href="/admin/products/new">
              <Icon name="plus" size={15} /> Add product
            </Link>
          </Button>
        }
      />
      <ListToolbar
        searchPlaceholder="Search name or SKU…"
        filters={[
          {
            name: 'category',
            label: 'Categories',
            options: categories.map((c) => ({
              value: c.id,
              label: c.parentId ? `— ${c.name}` : c.name,
            })),
          },
          {
            name: 'supplier',
            label: 'Suppliers',
            options: suppliers.map((s) => ({ value: s.id, label: s.name })),
          },
          {
            name: 'status',
            label: 'Statuses',
            width: 'w-36',
            options: [
              { value: 'published', label: 'Published' },
              { value: 'draft', label: 'Draft' },
            ],
          },
          {
            name: 'business',
            label: 'Businesses',
            options: businesses.map((b) => ({ value: b.slug, label: b.name })),
          },
          {
            name: 'visibility',
            label: 'Visibility',
            width: 'w-40',
            options: PRODUCT_VISIBILITIES.map((v) => ({
              value: v,
              label: v === 'public' ? 'Public' : 'Private',
            })),
          },
          {
            name: 'stock',
            label: 'Stock',
            width: 'w-36',
            options: STOCK_STATUSES.map((s) => ({ value: s, label: STOCK_STATUS_LABELS[s] })),
          },
        ]}
      />
      <ProductsTable data={data} businesses={businesses} />
    </>
  );
}
