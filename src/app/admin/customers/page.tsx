import type { Metadata } from 'next';

import { listCustomers } from '@/services/users';
import { PageHeader } from '@components/shared';
import { pageParam, param, type SearchParams } from '@lib/search-params';

import { ListToolbar } from '../components/list-toolbar';
import { CustomersTable } from './components/customers-table';

export const metadata: Metadata = { title: 'Customers' };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const data = await listCustomers({ q: param(sp, 'q'), page: pageParam(sp) });
  return (
    <>
      <PageHeader title="Customers" description={`${data.total} registered customers`} />
      <ListToolbar searchPlaceholder="Name, email or phone…" />
      <CustomersTable data={data} />
    </>
  );
}
