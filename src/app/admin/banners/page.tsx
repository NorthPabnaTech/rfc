import type { Metadata } from 'next';

import { listAdminBanners } from '@/services/banners';
import { listBusinesses } from '@/services/businesses';
import { PageHeader } from '@components/shared';
import { requireAdminPage } from '@lib/auth/current-user';

import { BannersManager } from './components/banners-manager';

export const metadata: Metadata = { title: 'Banners' };

export default async function BannersPage() {
  await requireAdminPage();
  const [banners, businesses] = await Promise.all([
    listAdminBanners(),
    listBusinesses({ activeOnly: true }),
  ]);
  return (
    <>
      <PageHeader
        title="Promotional banners"
        description="Campaigns such as Eid offers, winter sales and flash sales per business. Active banners appear on the store automatically."
      />
      <BannersManager banners={banners} businesses={businesses} />
    </>
  );
}
