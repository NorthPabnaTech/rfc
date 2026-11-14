import type { Metadata } from 'next';

import { listBusinesses } from '@/services/businesses';
import { listCategories, listSuppliers, listTags } from '@/services/catalog';
import { getSupplierImportDraft } from '@/services/supplier-sync';
import { Callout, PageHeader } from '@components/shared';
import { param, type SearchParams } from '@lib/search-params';
import { objectId } from '@lib/validators/common';

import { ProductForm } from '../components/product-form';

export const metadata: Metadata = { title: 'Add product' };

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supplierId = param(sp, 'supplierId');
  const externalProductId = param(sp, 'externalProductId');

  const [categories, tags, suppliers, businesses] = await Promise.all([
    listCategories(),
    listTags(),
    listSuppliers(),
    listBusinesses({ activeOnly: true }),
  ]);

  let initialDraft: Awaited<ReturnType<typeof getSupplierImportDraft>> | undefined;
  let importError: string | undefined;
  if (supplierId && externalProductId && objectId.safeParse(supplierId).success) {
    try {
      initialDraft = await getSupplierImportDraft(supplierId, externalProductId);
    } catch (err) {
      importError = err instanceof Error ? err.message : 'Failed to load supplier product.';
    }
  }

  const missing = categories.length === 0 || suppliers.length === 0;

  return (
    <>
      <PageHeader
        title={initialDraft ? 'Import supplier product' : 'Add product'}
        description={
          initialDraft
            ? `Review and customize this ${initialDraft.supplierName ?? 'supplier'} product before saving or publishing.`
            : 'Add a product from one of your suppliers.'
        }
        backHref={
          initialDraft && supplierId ? `/admin/suppliers/${supplierId}` : '/admin/products'
        }
        backLabel={initialDraft ? 'Supplier catalog' : 'Products'}
      />
      {importError && (
        <Callout tone="danger" className="mb-5" title="Supplier import warning">
          {importError}
        </Callout>
      )}
      {missing && (
        <Callout
          tone="warn"
          className="mb-5"
          title="Set up your catalog first"
          description="You need at least one category and one supplier before adding products."
        />
      )}
      <ProductForm
        initialDraft={initialDraft}
        categories={categories}
        tags={tags}
        suppliers={suppliers}
        businesses={businesses}
      />
    </>
  );
}
