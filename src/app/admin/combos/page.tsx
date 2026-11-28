import type { Metadata } from 'next';
import Link from 'next/link';

import { listBusinesses } from '@/services/businesses';
import { listAdminCombos } from '@/services/combos';
import { Icon } from '@components/icon/icon';
import { PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { requireAdminPage } from '@lib/auth/current-user';

import { CombosTable } from './components/combos-table';

export const metadata: Metadata = { title: 'Combo offers' };

export default async function CombosPage() {
  await requireAdminPage();
  const [combos, businesses] = await Promise.all([
    listAdminCombos(),
    listBusinesses({ activeOnly: true }),
  ]);
  return (
    <>
      <PageHeader
        title="Combo offers"
        description="Bundle products at a special price per business. Combos appear on the store and at /combo-offers."
        actions={
          <Button variant="primary" asChild>
            <Link href="/admin/combos/new">
              <Icon name="plus" size={15} /> New combo
            </Link>
          </Button>
        }
      />
      <CombosTable combos={combos} businesses={businesses} />
    </>
  );
}
