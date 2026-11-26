import { NextRequest } from 'next/server';
import { z } from 'zod';

import { searchProducts } from '@/services/products';
import {
  storefrontError,
  storefrontJson,
  storefrontOptionsResponse,
  verifyStorefrontKey,
} from '@lib/storefront-api';

const querySchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.string().trim().max(120).optional(),
  tags: z.string().trim().max(240).optional(),
  minPrice: z.coerce.number().finite().min(0).optional(),
  maxPrice: z.coerce.number().finite().min(0).optional(),
  availability: z.enum(['in_stock']).optional(),
  onSale: z.enum(['1', 'true']).optional(),
  featured: z.enum(['1', 'true']).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular', 'rating']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(48).optional(),
});

export function OPTIONS() {
  return storefrontOptionsResponse();
}

export async function GET(req: NextRequest) {
  const denied = verifyStorefrontKey(req);
  if (denied) return denied;

  try {
    const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = querySchema.parse(raw);
    const data = await searchProducts({
      q: parsed.q,
      category: parsed.category,
      tags: parsed.tags ? parsed.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      minPrice: parsed.minPrice,
      maxPrice: parsed.maxPrice,
      availability: parsed.availability,
      onSale: parsed.onSale === '1' || parsed.onSale === 'true',
      featured: parsed.featured === '1' || parsed.featured === 'true',
      sort: parsed.sort,
      page: parsed.page,
      pageSize: parsed.pageSize,
    });
    return storefrontJson(data);
  } catch (error) {
    return storefrontError(error);
  }
}
