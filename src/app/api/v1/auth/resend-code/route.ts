import { body, handler, ok } from '@/server/http';
import { emailInput, resendCode } from '@/server/services/auth';

export const POST = handler(async (req) => {
  await resendCode((await body(req, emailInput)).email.toLowerCase());
  return ok({ sent: true });
});
