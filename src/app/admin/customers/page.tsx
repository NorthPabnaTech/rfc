import type { Metadata } from 'next';

import { getCustomerCounts, listCustomers } from '@/services/users';
import { PageHeader } from '@components/shared';
import { pageParam, param, type SearchParams } from '@lib/search-params';

import { ListToolbar } from '../components/list-toolbar';
import { CustomerStatusCards } from './components/customer-status-cards';
import { CustomersTable } from './components/customers-table';

export const metadata: Metadata = { title: 'Customers' };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const rawStatus = param(sp, 'status');
  const status = rawStatus === 'active' || rawStatus === 'disabled' ? rawStatus : undefined;
  const [data, counts] = await Promise.all([
    listCustomers({ q: param(sp, 'q'), status, page: pageParam(sp) }),
    getCustomerCounts(),
  ]);
  return (
    <>
      <PageHeader title="Customers" description={`${counts.total} registered customers`} />
      <CustomerStatusCards counts={counts} />
      <ListToolbar
        searchPlaceholder="Name, email or phone…"
        filters={[
          {
            name: 'status',
            label: 'Statuses',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'disabled', label: 'Disabled' },
            ],
          },
        ]}
      />
      <CustomersTable data={data} />
    </>
  );
}
