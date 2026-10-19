import type { Metadata } from 'next';

import { listReturns } from '@/services/returns';
import { PageHeader } from '@components/shared';
import { RETURN_STATUS_LABELS, RETURN_STATUSES } from '@lib/constants';
import { pageParam, param, type SearchParams } from '@lib/search-params';

import { ListToolbar } from '../components/list-toolbar';
import { ReturnsList } from './components/returns-list';

export const metadata: Metadata = { title: 'Returns' };

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const data = await listReturns({
    status: RETURN_STATUSES.find((s) => s === param(sp, 'status')),
    page: pageParam(sp),
  });
  return (
    <>
      <PageHeader
        title="Returns"
        description="Customers can request a return within 7 days of delivery."
      />
      <ListToolbar
        search={false}
        filters={[
          {
            name: 'status',
            label: 'Statuses',
            options: RETURN_STATUSES.map((s) => ({ value: s, label: RETURN_STATUS_LABELS[s] })),
          },
        ]}
      />
      <ReturnsList data={data} />
    </>
  );
}
