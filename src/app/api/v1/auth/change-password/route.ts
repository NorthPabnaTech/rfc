import { body, handler, ok } from '@/server/http';
import { changePassword, changePasswordInput } from '@/server/services/auth';
import { requireUser } from '@/server/session';

export const POST = handler(async (req) => {
  const user = await requireUser();
  await changePassword(user.id, await body(req, changePasswordInput));
  return ok({ changed: true });
});
