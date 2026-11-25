import { z } from 'zod';

import { body, handler, ok } from '@/server/http';
import { toWithdrawal } from '@/server/mappers';
import { requestWithdrawal } from '@/server/services/wallet';
import { requireSeller } from '@/server/session';

const input = z.object({
  amount: z.coerce.number().int().positive(),
  method: z.enum(['bkash', 'nagad', 'rocket', 'bank']),
  account: z.string().trim().min(6).max(40),
});

export const POST = handler(async (req) => {
  const seller = await requireSeller();
  return ok(toWithdrawal((await requestWithdrawal(seller, await body(req, input))).toObject()), 201);
});
