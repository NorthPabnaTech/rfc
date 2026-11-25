import { AppError } from '@lib/errors';

import { handler, ok } from '@/server/http';
import { bootstrap } from '@/server/services/bootstrap';
import { requireUser } from '@/server/session';

export const GET = handler(async () => {
  const user = await requireUser();
  if (user.role === 'seller' && user.status !== 'active') {
    throw new AppError('Your seller account is awaiting approval.', 403);
  }
  return ok({ user, ...(await bootstrap(user)) });
});
