import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getAdminCombo } from '@/services/combos';
import { Icon } from '@components/icon/icon';
import { PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { objectId } from '@lib/validators/common';

import { ComboForm } from '../../components/combo-form';

export const metadata: Metadata = { title: 'Edit combo' };

export default async function EditComboPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!objectId.safeParse(id).success) notFound();
  const combo = await getAdminCombo(id);
  if (!combo) notFound();

  return (
    <>
      <PageHeader
        title={combo.name}
        subtitle="Edit combo"
        backHref="/admin/combos"
        backLabel="Combo offers"
        actions={
          combo.status === 'published' && (
            <Button variant="secondary" asChild>
              <Link href={`/products/${combo.slug}`} target="_blank">
                <Icon name="external" size={15} /> View in store
              </Link>
            </Button>
          )
        }
      />
      <ComboForm combo={combo} />
    </>
  );
}
