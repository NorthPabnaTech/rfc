import { body, handler, ok } from '@/server/http';
import { toCategory } from '@/server/mappers';
import { categoryInput, deleteCategory, saveCategory } from '@/server/services/catalog';
import { requireAdmin } from '@/server/session';

export const PUT = handler<{ id: string }>(async (req, { id }) => {
  await requireAdmin();
  return ok(toCategory(await saveCategory(await body(req, categoryInput), id)));
});

export const DELETE = handler<{ id: string }>(async (_req, { id }) => {
  await requireAdmin();
  await deleteCategory(id);
  return ok({ deleted: id });
});
