import { NextRequest } from 'next/server';

import { getActiveBanners } from '@/services/banners';
import { getBusinessBySlug } from '@/services/businesses';
import { getActiveCampaigns } from '@/services/campaigns';
import { getCategoryTree } from '@/services/catalog';
import { getSettings } from '@/services/settings';
import {
  getStorefrontBusiness,
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
    const businessSlug = await getStorefrontBusiness(req);
    const [business, settings, categories, banners, campaigns] = await Promise.all([
      getBusinessBySlug(businessSlug),
      getSettings(),
      getCategoryTree(businessSlug),
      getActiveBanners(businessSlug),
      getActiveCampaigns(),
    ]);
    return storefrontJson({ business, settings, categories, banners, campaigns });
  } catch (error) {
    return storefrontError(error);
  }
}
