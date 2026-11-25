import { body, handler, ok } from '@/server/http';
import { settingsPatchSchema, updateSettings } from '@/server/services/settings';
import { requireAdmin } from '@/server/session';

export const PATCH = handler(async (req) => {
  await requireAdmin();
  return ok(await updateSettings(await body(req, settingsPatchSchema)));
});
