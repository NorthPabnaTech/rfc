import type { Metadata } from 'next';

import { listBusinesses } from '@/services/businesses';
import { PageHeader } from '@components/shared';

import { BusinessesManager } from './components/businesses-manager';

export const metadata: Metadata = { title: 'Businesses & Stores' };

export default async function BusinessesPage() {
  const businesses = await listBusinesses();
  return (
    <>
      <PageHeader
        title="Businesses & Stores"
        description="Manage multiple stores from a single admin panel. Only RFC Gadget is publicly visible."
      />
      <BusinessesManager businesses={businesses} />
    </>
  );
}
