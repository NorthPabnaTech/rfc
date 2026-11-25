import { z } from 'zod';

import { body, handler, ok } from '@/server/http';
import { toWithdrawal } from '@/server/mappers';
import { setWithdrawalStatus } from '@/server/services/wallet';
import { requireAdmin } from '@/server/session';

const input = z.object({
  status: z.enum(['approved', 'rejected', 'completed']),
  note: z.string().trim().max(300).optional(),
});

export const PATCH = handler<{ withdrawalNo: string }>(async (req, { withdrawalNo }) => {
  await requireAdmin();
  const { status, note } = await body(req, input);
  return ok(toWithdrawal((await setWithdrawalStatus(withdrawalNo, status, note)).toObject()));
});
