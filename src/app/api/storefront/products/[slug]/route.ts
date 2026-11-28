import { NextRequest } from 'next/server';

import { listProductQuestions, listProductReviews } from '@/services/engagement';
import { getProductBySlug, getRelatedProducts } from '@/services/products';
import { AppError } from '@lib/errors';
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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const denied = verifyStorefrontKey(req);
  if (denied) return denied;

  try {
    const business = await getStorefrontBusiness(req);
    const { slug } = await context.params;
    const product = await getProductBySlug(slug, business);
    if (!product) throw new AppError('Product not found.', 404);

    const [related, reviews, questions] = await Promise.all([
      getRelatedProducts(product, 8, business),
      listProductReviews(product.id),
      listProductQuestions(product.id),
    ]);
    return storefrontJson({ product, related, reviews, questions });
  } catch (error) {
    return storefrontError(error);
  }
}
