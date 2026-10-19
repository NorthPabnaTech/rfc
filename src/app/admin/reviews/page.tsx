import type { Metadata } from 'next';

import { listAdminReviews } from '@/services/engagement';
import { PageHeader } from '@components/shared';
import { pageParam, param, type SearchParams } from '@lib/search-params';

import { ListToolbar } from '../components/list-toolbar';
import { ReviewsList } from './components/reviews-list';

export const metadata: Metadata = { title: 'Reviews' };

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const visibility = param(sp, 'visibility');
  const rating = Number(param(sp, 'rating'));
  const data = await listAdminReviews({
    q: param(sp, 'q'),
    visibility: visibility === 'hidden' || visibility === 'visible' ? visibility : undefined,
    rating: rating >= 1 && rating <= 5 ? rating : undefined,
    page: pageParam(sp),
  });
  return (
    <>
      <PageHeader
        title="Reviews"
        description="Hidden reviews don’t appear on the store and don’t count toward ratings."
      />
      <ListToolbar
        searchPlaceholder="Search review text…"
        filters={[
          {
            name: 'visibility',
            label: 'Visibility',
            width: 'w-36',
            options: [
              { value: 'visible', label: 'Visible' },
              { value: 'hidden', label: 'Hidden' },
            ],
          },
          {
            name: 'rating',
            label: 'Ratings',
            width: 'w-36',
            options: [5, 4, 3, 2, 1].map((n) => ({
              value: String(n),
              label: `${n} star${n > 1 ? 's' : ''}`,
            })),
          },
        ]}
      />
      <ReviewsList data={data} />
    </>
  );
}
