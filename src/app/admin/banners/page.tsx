import type { Metadata } from 'next';

import { listAdminBanners } from '@/services/banners';
import { PageHeader } from '@components/shared';

import { BannersManager } from './components/banners-manager';

export const metadata: Metadata = { title: 'Banners' };

export default async function BannersPage() {
  const banners = await listAdminBanners();
  return (
    <>
      <PageHeader
        title="Promotional banners"
        description="Campaigns such as Eid offers, winter sales and flash sales. Active banners appear on the store automatically."
      />
      <BannersManager banners={banners} />
    </>
  );
}
