import { NextRequest } from 'next/server';
import { z } from 'zod';

import { listCombos } from '@/services/combos';
import {
  getStorefrontBusiness,
  storefrontError,
  storefrontJson,
  storefrontOptionsResponse,
  verifyStorefrontKey,
} from '@lib/storefront-api';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

export function OPTIONS() {
  return storefrontOptionsResponse();
}

export async function GET(req: NextRequest) {
  const denied = verifyStorefrontKey(req);
  if (denied) return denied;

  try {
    const business = await getStorefrontBusiness(req);
    const { page } = querySchema.parse({
      page: req.nextUrl.searchParams.get('page') ?? undefined,
    });
    const data = await listCombos(page, business);
    return storefrontJson(data);
  } catch (error) {
    return storefrontError(error);
  }
}
