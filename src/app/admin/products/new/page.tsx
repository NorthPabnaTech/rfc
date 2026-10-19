import type { Metadata } from 'next';

import { listCategories, listSuppliers, listTags } from '@/services/catalog';
import { Callout, PageHeader } from '@components/shared';

import { ProductForm } from '../components/product-form';

export const metadata: Metadata = { title: 'Add product' };

export default async function NewProductPage() {
  const [categories, tags, suppliers] = await Promise.all([
    listCategories(),
    listTags(),
    listSuppliers(),
  ]);
  const missing = categories.length === 0 || suppliers.length === 0;

  return (
    <>
      <PageHeader
        title="Add product"
        description="Add a product from one of your suppliers."
        backHref="/admin/products"
        backLabel="Products"
      />
      {missing && (
        <Callout
          tone="warn"
          className="mb-5"
          title="Set up your catalog first"
          description="You need at least one category and one supplier before adding products."
        />
      )}
      <ProductForm categories={categories} tags={tags} suppliers={suppliers} />
    </>
  );
}
