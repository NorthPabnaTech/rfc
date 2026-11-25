import { z } from 'zod';

import { body, handler, ok } from '@/server/http';
import { toDeposit } from '@/server/mappers';
import { reviewDeposit } from '@/server/services/wallet';
import { requireAdmin } from '@/server/session';

const input = z.object({ decision: z.enum(['approve', 'reject']) });

export const PATCH = handler<{ depositNo: string }>(async (req, { depositNo }) => {
  await requireAdmin();
  return ok(toDeposit((await reviewDeposit(depositNo, (await body(req, input)).decision)).toObject()));
});
