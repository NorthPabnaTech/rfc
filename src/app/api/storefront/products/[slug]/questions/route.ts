import { NextRequest } from 'next/server';
import { z } from 'zod';

import { askQuestion } from '@/services/engagement';
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
import { requiredText } from '@lib/validators/common';

const bodySchema = z.object({
  question: requiredText('Question', 500),
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
    const { question } = bodySchema.parse(rawBody);
    await askQuestion(userId, product.id, question);

    return storefrontJson({ submitted: true }, 201);
  } catch (error) {
    return storefrontError(error);
  }
}
