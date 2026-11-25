import { z } from 'zod';

import { body, handler, ok } from '@/server/http';
import { markRead } from '@/server/services/notify';
import { requireUser } from '@/server/session';

const input = z.object({ ids: z.union([z.literal('all'), z.array(z.string()).max(200)]) });

export const POST = handler(async (req) => {
  const user = await requireUser();
  await markRead(user, (await body(req, input)).ids);
  return ok({ read: true });
});
