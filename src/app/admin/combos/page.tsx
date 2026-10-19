import type { Metadata } from 'next';
import Link from 'next/link';

import { listAdminCombos } from '@/services/combos';
import { Icon } from '@components/icon/icon';
import { PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';

import { CombosTable } from './components/combos-table';

export const metadata: Metadata = { title: 'Combo offers' };

export default async function CombosPage() {
  const combos = await listAdminCombos();
  return (
    <>
      <PageHeader
        title="Combo offers"
        description="Bundle products at a special price. Combos appear on the homepage and at /combo-offers."
        actions={
          <Button variant="primary" asChild>
            <Link href="/admin/combos/new">
              <Icon name="plus" size={15} /> New combo
            </Link>
          </Button>
        }
      />
      <CombosTable combos={combos} />
    </>
  );
}
