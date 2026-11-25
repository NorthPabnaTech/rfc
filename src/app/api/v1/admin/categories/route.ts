import { body, handler, ok } from '@/server/http';
import { toCategory } from '@/server/mappers';
import { categoryInput, saveCategory } from '@/server/services/catalog';
import { requireAdmin } from '@/server/session';

export const POST = handler(async (req) => {
  await requireAdmin();
  return ok(toCategory(await saveCategory(await body(req, categoryInput))), 201);
});
