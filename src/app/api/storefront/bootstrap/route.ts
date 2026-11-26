import { NextRequest } from 'next/server';

import { getActiveBanners } from '@/services/banners';
import { getActiveCampaigns } from '@/services/campaigns';
import { getCategoryTree } from '@/services/catalog';
import { getSettings } from '@/services/settings';
import {
  storefrontError,
  storefrontJson,
  storefrontOptionsResponse,
  verifyStorefrontKey,
} from '@lib/storefront-api';

export function OPTIONS() {
  return storefrontOptionsResponse();
}

export async function GET(req: NextRequest) {
  const denied = verifyStorefrontKey(req);
  if (denied) return denied;

  try {
    const [settings, categories, banners, campaigns] = await Promise.all([
      getSettings(),
      getCategoryTree(),
      getActiveBanners(),
      getActiveCampaigns(),
    ]);
    return storefrontJson({ settings, categories, banners, campaigns });
  } catch (error) {
    return storefrontError(error);
  }
}
