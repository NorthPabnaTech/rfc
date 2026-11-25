import { handler, ok } from '@/server/http';
import { logout } from '@/server/services/auth';

export const POST = handler(async () => {
  await logout();
  return ok({ signedOut: true });
});
