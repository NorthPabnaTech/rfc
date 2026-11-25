'use client';

import * as React from 'react';
import { useRouter } from 'nextjs-toploader/app';

import { setCustomerActiveAction } from '@/actions/admin';
import { Taka } from '@/features/products/price';
import type { CustomerRowDTO, Paginated } from '@/types';
import { Icon } from '@components/icon/icon';
import { ConfirmDialog, StatusBadge } from '@components/shared';
import { Button } from '@components/ui/button';
import { type Column, DataTable } from '@components/ui/data-table';
import { Dropdown, type DropdownEntry } from '@components/ui/dropdown';
import { handleActionResult } from '@lib/action-client';
import { formatStoreDate } from '@lib/utils';

import { useUrlPagination } from '../../components/list-toolbar';

export function CustomersTable({ data }: { data: Paginated<CustomerRowDTO> }) {
  const router = useRouter();
  const { onPaginate } = useUrlPagination();
  const [toggling, setToggling] = React.useState<CustomerRowDTO | null>(null);

  const columns: Column<CustomerRowDTO>[] = [
    {
      key: 'name',
      wrap: true,
      minWidth: 220,
      header: 'Customer',
      cell: (c) => (
        <div className="flex items-center gap-3">
          {c.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- small avatar (Cloudinary or Google)
            <img
              src={c.avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="size-9 rounded-full object-cover"
            />
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
      key: 'profit',
      header: 'Profit',
      align: 'right',
      cell: (c) => (
        <Taka
          amount={c.totalProfit}
          className={c.totalProfit >= 0 ? 'font-semibold text-emerald-500' : 'font-semibold text-rose-500'}
        />
      ),
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
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (c) => {
        const items: DropdownEntry[] = [
          {
            label: 'View details',
            icon: 'eye',
            onClick: () => router.push(`/admin/customers/${c.id}`),
          },
          {
            label: c.isActive ? 'Disable customer' : 'Activate customer',
            icon: c.isActive ? 'cancelCircle' : 'checkCircle',
            destructive: c.isActive,
            onClick: () => setToggling(c),
          },
        ];
        return (
          <div className="inline-flex items-center" onClick={(e) => e.stopPropagation()}>
            <Dropdown align="end" items={items}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Actions for ${c.name}`}
              >
                <Icon name="more" size={16} />
              </Button>
            </Dropdown>
          </div>
        );
      },
    },
  ];

  return (
    <>
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

      <ConfirmDialog
        open={!!toggling}
        onOpenChange={(o) => !o && setToggling(null)}
        tone={toggling?.isActive ? 'danger' : undefined}
        title={toggling?.isActive ? 'Disable customer?' : 'Activate customer?'}
        description={
          toggling?.isActive
            ? `"${toggling?.name}" will no longer be able to sign in or place orders.`
            : `"${toggling?.name}" will be able to sign in and place orders again.`
        }
        confirmLabel={toggling?.isActive ? 'Disable' : 'Activate'}
        onConfirm={async () => {
          if (!toggling) return;
          const res = await setCustomerActiveAction(toggling.id, !toggling.isActive);
          if (handleActionResult(res)) {
            setToggling(null);
            router.refresh();
          }
        }}
      />
    </>
  );
}
