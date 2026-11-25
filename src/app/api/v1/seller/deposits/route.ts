import { z } from 'zod';

import { body, handler, ok } from '@/server/http';
import { toDeposit } from '@/server/mappers';
import { createDeposit } from '@/server/services/wallet';
import { requireSeller } from '@/server/session';

const input = z.object({
  amount: z.coerce.number().int().positive(),
  method: z.enum(['bkash', 'nagad', 'rocket', 'bank']),
  reference: z.string().trim().min(4).max(60),
  senderNumber: z.string().trim().max(20).optional(),
});

export const POST = handler(async (req) => {
  const seller = await requireSeller();
  return ok(toDeposit((await createDeposit(seller, await body(req, input))).toObject()), 201);
});
