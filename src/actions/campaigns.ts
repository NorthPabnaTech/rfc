'use server';

import { revalidatePath } from 'next/cache';

import { deleteCampaign, saveCampaign, toggleCampaignActive } from '@/services/campaigns';
import { requireAdmin } from '@lib/auth/current-user';
import { type ActionResult, runAction } from '@lib/errors';
import { campaignSchema } from '@lib/validators/campaign';

function revalidateCampaignPaths() {
  revalidatePath('/admin/campaigns');
  revalidatePath('/', 'layout');
  revalidatePath('/products');
  revalidatePath('/checkout');
}

export async function saveCampaignAction(input: unknown, id?: string): Promise<ActionResult> {
  return runAction(
    async () => {
      await requireAdmin();
      const parsed = campaignSchema.parse(input);
      await saveCampaign(parsed, id);
      revalidateCampaignPaths();
      return undefined;
    },
    id ? 'Campaign updated' : 'Campaign created',
  );
}

export async function toggleCampaignAction(id: string, isActive: boolean): Promise<ActionResult> {
  return runAction(
    async () => {
      await requireAdmin();
      await toggleCampaignActive(id, isActive);
      revalidateCampaignPaths();
      return undefined;
    },
    isActive ? 'Campaign activated' : 'Campaign paused',
  );
}

export async function deleteCampaignAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await deleteCampaign(id);
    revalidateCampaignPaths();
    return undefined;
  }, 'Campaign deleted');
}
