import { NextRequest } from 'next/server';
import { z } from 'zod';

import { createReview } from '@/services/engagement';
import { getProductBySlug } from '@/services/products';
import { AppError } from '@lib/errors';
import {
  getStorefrontBusiness,
  getStorefrontCustomerId,
  storefrontError,
  storefrontJson,
  storefrontOptionsResponse,
  verifyStorefrontKey,
} from '@lib/storefront-api';
import { optionalText } from '@lib/validators/common';

const bodySchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: optionalText(1500),
});

export function OPTIONS() {
  return storefrontOptionsResponse();
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const denied = verifyStorefrontKey(req);
  if (denied) return denied;

  try {
    const userId = await getStorefrontCustomerId(req);
    if (!userId) throw new AppError('Unauthorized.', 401);

    const business = await getStorefrontBusiness(req);
    const { slug } = await context.params;
    const product = await getProductBySlug(slug, business);
    if (!product) throw new AppError('Product not found.', 404);

    const rawBody: unknown = await req.json();
    const { rating, comment } = bodySchema.parse(rawBody);
    await createReview(userId, { productId: product.id, rating, comment: comment ?? '', images: [] });

    return storefrontJson({ submitted: true }, 201);
  } catch (error) {
    return storefrontError(error);
  }
}
