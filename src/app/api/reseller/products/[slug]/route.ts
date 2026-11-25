import { NextRequest } from 'next/server';

import { getResellerProductBySlug } from '@/services/resellers';
import {
  getOptionalReseller,
  resellerError,
  resellerJson,
  resellerOptionsResponse,
} from '@lib/auth/reseller-auth';

export function OPTIONS() {
  return resellerOptionsResponse();
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const reseller = await getOptionalReseller(req);
    const product = await getResellerProductBySlug(slug, Boolean(reseller));
    if (!product) {
      return resellerError('Product not found or not enabled for resellers.', 404);
    }

    return resellerJson({
      ok: true,
      authenticated: Boolean(reseller),
      data: product,
    });
  } catch {
    return resellerError('Failed to load product.', 500);
  }
}
