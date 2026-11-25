import { body, handler, ok } from '@/server/http';
import { resetInput, resetPassword } from '@/server/services/auth';

export const POST = handler(async (req) => {
  await resetPassword(await body(req, resetInput));
  return ok({ reset: true });
});
