import type { Metadata } from 'next';

import { listAdminCampaigns, listCampaignProductOptions } from '@/services/campaigns';
import { PageHeader } from '@components/shared';

import { CampaignsManager } from './components/campaigns-manager';

export const metadata: Metadata = { title: 'Campaigns' };

export default async function CampaignsPage() {
  const [campaigns, products] = await Promise.all([
    listAdminCampaigns(),
    listCampaignProductOptions(),
  ]);
  return (
    <>
      <PageHeader
        title="Campaigns & Coupons"
        description="Run timed offers or coupon codes with percentage or fixed discounts across one, multiple, or all products."
      />
      <CampaignsManager campaigns={campaigns} products={products} />
    </>
  );
}
