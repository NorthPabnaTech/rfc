import type { Metadata } from 'next';

import { listAdminCampaigns, listCampaignProductOptions } from '@/services/campaigns';
import { requireAdminPage } from '@lib/auth/current-user';

import { CampaignsManager } from './components/campaigns-manager';

export const metadata: Metadata = { title: 'Campaigns' };

export default async function CampaignsPage() {
  await requireAdminPage();
  const [campaigns, products] = await Promise.all([
    listAdminCampaigns(),
    listCampaignProductOptions(),
  ]);
  return <CampaignsManager campaigns={campaigns} products={products} />;
}
