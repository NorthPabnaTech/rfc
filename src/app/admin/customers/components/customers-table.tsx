'use client';

import { useRouter } from 'next/navigation';

import { Taka } from '@/features/products/price';
import type { CustomerRowDTO, Paginated } from '@/types';
import { StatusBadge } from '@components/shared';
import { type Column, DataTable } from '@components/ui/data-table';
import { formatStoreDate } from '@lib/utils';

import { useUrlPagination } from '../../components/list-toolbar';

export function CustomersTable({ data }: { data: Paginated<CustomerRowDTO> }) {
  const router = useRouter();
  const { onPaginate } = useUrlPagination();

  const columns: Column<CustomerRowDTO>[] = [
    {
      key: 'name',
      wrap: true,
      minWidth: 220,
      header: 'Customer',
      cell: (c) => (
        <div className="flex items-center gap-3">
          {c.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- small Cloudinary avatar
            <img src={c.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
          ) : (
            <span className="bg-brand-gradient text-brand-contrast grid size-9 place-items-center rounded-full text-sm font-bold">
              {c.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <p className="text-ink font-semibold">{c.name}</p>
            <p className="text-subtle text-[11.5px]">{c.phone ?? c.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', cell: (c) => c.phone ?? '—' },
    { key: 'orders', header: 'Orders', align: 'right', cell: (c) => c.orderCount },
    {
      key: 'spent',
      header: 'Total spent',
      align: 'right',
      cell: (c) => <Taka amount={c.totalSpent} className="font-semibold" />,
    },
    {
      key: 'joined',
      header: 'Joined',
      cell: (c) => <span className="text-muted">{formatStoreDate(c.createdAt)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (c) => (
        <StatusBadge
          status={c.isActive ? 'ok' : 'danger'}
          label={c.isActive ? 'Active' : 'Disabled'}
        />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      source={data.items}
      rowKey="id"
      onRowClick={(c) => router.push(`/admin/customers/${c.id}`)}
      page={data.page}
      limit={data.pageSize}
      total={data.total}
      onPaginate={onPaginate}
      empty={{
        title: 'No customers yet',
        description: 'Customers appear here when they register.',
      }}
    />
  );
}
