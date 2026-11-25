import { z } from 'zod';

import { body, handler, objectId, ok } from '@/server/http';
import { toDeposit } from '@/server/mappers';
import { manualCredit } from '@/server/services/wallet';
import { requireAdmin } from '@/server/session';

const input = z.object({
  sellerId: objectId,
  amount: z.coerce.number().int().positive(),
  method: z.enum(['bkash', 'nagad', 'rocket', 'bank']),
  reference: z.string().trim().min(1).max(60),
});

export const POST = handler(async (req) => {
  await requireAdmin();
  return ok(toDeposit((await manualCredit(await body(req, input))).toObject()), 201);
});
