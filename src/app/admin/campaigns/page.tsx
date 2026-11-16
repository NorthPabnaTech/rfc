import type { Metadata } from 'next';

import { listAdminCampaigns, listCampaignProductOptions } from '@/services/campaigns';

import { CampaignsManager } from './components/campaigns-manager';

export const metadata: Metadata = { title: 'Campaigns' };

export default async function CampaignsPage() {
  const [campaigns, products] = await Promise.all([
    listAdminCampaigns(),
    listCampaignProductOptions(),
  ]);
  return <CampaignsManager campaigns={campaigns} products={products} />;
}
