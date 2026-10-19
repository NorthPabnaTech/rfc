import type { Metadata } from 'next';

import { PageHeader } from '@components/shared';

import { ComboForm } from '../components/combo-form';

export const metadata: Metadata = { title: 'New combo' };

export default function NewComboPage() {
  return (
    <>
      <PageHeader
        title="New combo offer"
        description="Bundle products at a price lower than buying them separately."
        backHref="/admin/combos"
        backLabel="Combo offers"
      />
      <ComboForm />
    </>
  );
}
