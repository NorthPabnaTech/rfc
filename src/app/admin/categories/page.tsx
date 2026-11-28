import type { Metadata } from 'next';

import { listBusinesses } from '@/services/businesses';
import { listCategories } from '@/services/catalog';
import { PageHeader } from '@components/shared';
import { requireAdminPage } from '@lib/auth/current-user';

import { CategoriesManager } from './components/categories-manager';

export const metadata: Metadata = { title: 'Categories' };

export default async function CategoriesPage() {
  await requireAdminPage();
  const [categories, businesses] = await Promise.all([
    listCategories(),
    listBusinesses({ activeOnly: true }),
  ]);
  return (
    <>
      <PageHeader
        title="Categories"
        description="Two levels: top-level categories and their sub-categories per business. Featured categories appear on the homepage."
      />
      <CategoriesManager categories={categories} businesses={businesses} />
    </>
  );
}
