import type { Metadata } from 'next';

import { listCategories } from '@/services/catalog';
import { PageHeader } from '@components/shared';

import { CategoriesManager } from './components/categories-manager';

export const metadata: Metadata = { title: 'Categories' };

export default async function CategoriesPage() {
  const categories = await listCategories();
  return (
    <>
      <PageHeader
        title="Categories"
        description="Two levels: top-level categories and their sub-categories. Featured categories appear on the homepage."
      />
      <CategoriesManager categories={categories} />
    </>
  );
}
