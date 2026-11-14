import type { Metadata } from 'next';

import { listBusinesses } from '@/services/businesses';
import { listExpenseCategories, listExpenses } from '@/services/expenses';
import { PageHeader } from '@components/shared';
import { EXPENSE_PAYMENT_METHOD_LABELS, EXPENSE_PAYMENT_METHODS } from '@lib/constants';
import { pageParam, param, type SearchParams } from '@lib/search-params';

import { ListToolbar } from '../components/list-toolbar';
import { ExpensesManager } from './components/expenses-manager';

export const metadata: Metadata = { title: 'Expense Management' };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const paymentMethod = EXPENSE_PAYMENT_METHODS.find(
    (m) => m === param(sp, 'paymentMethod'),
  );

  const [data, categories, businesses] = await Promise.all([
    listExpenses({
      q: param(sp, 'q'),
      categoryId: param(sp, 'category'),
      business: param(sp, 'business'),
      paymentMethod,
      from: param(sp, 'from'),
      to: param(sp, 'to'),
      page: pageParam(sp),
    }),
    listExpenseCategories(),
    listBusinesses(),
  ]);

  return (
    <>
      <PageHeader
        title="Expense Management"
        description="Track operating expenses and supplier purchases per business."
      />
      <ListToolbar
        searchPlaceholder="Search expense title or notes…"
        filters={[
          {
            name: 'business',
            label: 'Businesses',
            options: businesses.map((b) => ({ value: b.slug, label: b.name })),
          },
          {
            name: 'category',
            label: 'Categories',
            options: categories.map((c) => ({ value: c.id, label: c.name })),
          },
          {
            name: 'paymentMethod',
            label: 'Payment',
            options: EXPENSE_PAYMENT_METHODS.map((m) => ({
              value: m,
              label: EXPENSE_PAYMENT_METHOD_LABELS[m],
            })),
          },
        ]}
      />
      <ExpensesManager data={data} categories={categories} businesses={businesses} />
    </>
  );
}
