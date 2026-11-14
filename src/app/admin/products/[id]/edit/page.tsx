import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { listBusinesses } from '@/services/businesses';
import { listCategories, listSuppliers, listTags } from '@/services/catalog';
import { getAdminProduct } from '@/services/products';
import { Icon } from '@components/icon/icon';
import { PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { DEFAULT_BUSINESS_SLUG } from '@lib/constants';
import { objectId } from '@lib/validators/common';

import { ProductForm } from '../../components/product-form';

export const metadata: Metadata = { title: 'Edit product' };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!objectId.safeParse(id).success) notFound();
  const [product, categories, tags, suppliers, businesses] = await Promise.all([
    getAdminProduct(id),
    listCategories(),
    listTags(),
    listSuppliers(),
    listBusinesses({ activeOnly: true }),
  ]);
  if (!product) notFound();

  return (
    <>
      <PageHeader
        title={product.name}
        subtitle="Edit product"
        backHref="/admin/products"
        backLabel="Products"
        actions={
          product.status === 'published' &&
          product.visibility !== 'private' &&
          product.business === DEFAULT_BUSINESS_SLUG && (
            <Button variant="secondary" asChild>
              <Link href={`/products/${product.slug}`} target="_blank">
                <Icon name="external" size={15} /> View in store
              </Link>
            </Button>
          )
        }
      />
      <ProductForm
        product={product}
        categories={categories}
        tags={tags}
        suppliers={suppliers}
        businesses={businesses}
      />
    </>
  );
}
