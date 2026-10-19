'use server';

import { z } from 'zod';

import { listProductCardsByIds } from '@/services/products';
import type { ProductCardDTO } from '@/types';
import { type ActionResult, runAction } from '@lib/errors';
import { objectId } from '@lib/validators/common';

/** Fresh card data for wishlist items (prices/stock change after saving). */
export async function productCardsAction(ids: unknown): Promise<ActionResult<ProductCardDTO[]>> {
  return runAction(async () => listProductCardsByIds(z.array(objectId).max(100).parse(ids)));
}
