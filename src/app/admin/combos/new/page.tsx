import type { Metadata } from 'next';

import { listBusinesses } from '@/services/businesses';
import { PageHeader } from '@components/shared';

import { ComboForm } from '../components/combo-form';

export const metadata: Metadata = { title: 'New combo' };

export default async function NewComboPage() {
  const businesses = await listBusinesses({ activeOnly: true });
  return (
    <>
      <PageHeader
        title="New combo offer"
        description="Bundle products at a price lower than buying them separately."
        backHref="/admin/combos"
        backLabel="Combo offers"
      />
      <ComboForm businesses={businesses} />
    </>
  );
}
