import type { Metadata } from 'next';

import { listSuppliers } from '@/services/catalog';
import { PageHeader } from '@components/shared';

import { SuppliersManager } from './components/suppliers-manager';

export const metadata: Metadata = { title: 'Suppliers' };

export default async function SuppliersPage() {
  const suppliers = await listSuppliers();
  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Websites you source products from. Every product links to its supplier and supplier page."
      />
      <SuppliersManager suppliers={suppliers} />
    </>
  );
}
