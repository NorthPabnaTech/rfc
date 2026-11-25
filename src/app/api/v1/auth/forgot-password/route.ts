import { body, handler, ok } from '@/server/http';
import { emailInput, forgotPassword } from '@/server/services/auth';

export const POST = handler(async (req) => {
  await forgotPassword((await body(req, emailInput)).email);
  // Same answer whether or not the email is registered.
  return ok({ sent: true });
});
