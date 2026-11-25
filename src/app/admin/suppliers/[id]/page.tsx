import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ProductModel } from '@/database';
import { getSupplierById } from '@/services/catalog';
import { fetchSupplierCatalog } from '@/services/supplier-sync';
import { PageHeader } from '@components/shared';
import { requireAdminPage } from '@lib/auth/current-user';
import { objectId } from '@lib/validators/common';

import { SupplierBrowser } from './components/supplier-browser';

export const metadata: Metadata = { title: 'Supplier Integration' };

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  if (!objectId.safeParse(id).success) notFound();

  const supplier = await getSupplierById(id);
  if (!supplier) notFound();

  const linkedDocs = await ProductModel.find(
    { supplier: id, supplierProductId: { $exists: true, $ne: null } },
    'supplierProductId',
  ).lean();
  const linkedExternalIds = linkedDocs
    .map((d) => d.supplierProductId)
    .filter((v): v is string => Boolean(v));

  let initialCatalog: Awaited<ReturnType<typeof fetchSupplierCatalog>> | undefined;
  let initialError: string | undefined;

  if (supplier.type === 'api' && supplier.apiKeyConfigured) {
    try {
      initialCatalog = await fetchSupplierCatalog(supplier.id, { page: 1, limit: 20 });
    } catch (err) {
      initialError = err instanceof Error ? err.message : 'Failed to connect to supplier API.';
    }
  } else if (supplier.type === 'api') {
    initialError = `Environment variable ${supplier.apiKeyEnvVar || 'BUSINESS_KORO_API_KEY'} is not configured.`;
  }

  return (
    <>
      <PageHeader
        title={supplier.name}
        subtitle={`Supplier Integration · ${supplier.websiteUrl.replace(/^https?:\/\//, '')}`}
        backHref="/admin/suppliers"
        backLabel="Suppliers"
      />
      <SupplierBrowser
        supplier={supplier}
        initialCatalog={initialCatalog}
        initialError={initialError}
        linkedExternalIds={linkedExternalIds}
      />
    </>
  );
}
