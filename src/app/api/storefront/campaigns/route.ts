import { NextRequest } from 'next/server';

import { getActiveCampaigns } from '@/services/campaigns';
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
    const campaigns = await getActiveCampaigns();
    return storefrontJson(campaigns);
  } catch (error) {
    return storefrontError(error);
  }
}
