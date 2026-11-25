import { body, handler, ok } from '@/server/http';
import { adminProfileInput, updateAdminProfile } from '@/server/services/accounts';
import { requireAdmin } from '@/server/session';

export const PATCH = handler(async (req) => {
  const admin = await requireAdmin();
  const doc = await updateAdminProfile(admin.id, await body(req, adminProfileInput));
  return ok({ id: admin.id, name: doc?.name, email: doc?.email, phone: doc?.phone ?? '' });
});
