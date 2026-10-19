import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { listCategories, listSuppliers, listTags } from '@/services/catalog';
import { getAdminProduct } from '@/services/products';
import { Icon } from '@components/icon/icon';
import { PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { objectId } from '@lib/validators/common';

import { ProductForm } from '../../components/product-form';

export const metadata: Metadata = { title: 'Edit product' };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!objectId.safeParse(id).success) notFound();
  const [product, categories, tags, suppliers] = await Promise.all([
    getAdminProduct(id),
    listCategories(),
    listTags(),
    listSuppliers(),
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
          product.status === 'published' && (
            <Button variant="secondary" asChild>
              <Link href={`/products/${product.slug}`} target="_blank">
                <Icon name="external" size={15} /> View in store
              </Link>
            </Button>
          )
        }
      />
      <ProductForm product={product} categories={categories} tags={tags} suppliers={suppliers} />
    </>
  );
}
