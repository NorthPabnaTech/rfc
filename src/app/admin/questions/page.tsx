import type { Metadata } from 'next';

import { listAdminQuestions } from '@/services/engagement';
import { PageHeader } from '@components/shared';
import { pageParam, param, type SearchParams } from '@lib/search-params';

import { ListToolbar } from '../components/list-toolbar';
import { QuestionsList } from './components/questions-list';

export const metadata: Metadata = { title: 'Questions' };

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const state = param(sp, 'state');
  const data = await listAdminQuestions({
    state: state === 'unanswered' || state === 'answered' || state === 'hidden' ? state : undefined,
    page: pageParam(sp),
  });
  return (
    <>
      <PageHeader
        title="Product questions"
        description="Answered questions are shown on the product page."
      />
      <ListToolbar
        search={false}
        filters={[
          {
            name: 'state',
            label: 'Questions',
            options: [
              { value: 'unanswered', label: 'Unanswered' },
              { value: 'answered', label: 'Answered' },
              { value: 'hidden', label: 'Hidden' },
            ],
          },
        ]}
      />
      <QuestionsList data={data} />
    </>
  );
}
