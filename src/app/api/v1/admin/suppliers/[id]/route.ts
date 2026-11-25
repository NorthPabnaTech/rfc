import { body, handler, ok } from '@/server/http';
import { toSupplier } from '@/server/mappers';
import { deleteSupplier, saveSupplier, supplierInput } from '@/server/services/catalog';
import { requireAdmin } from '@/server/session';

export const PUT = handler<{ id: string }>(async (req, { id }) => {
  await requireAdmin();
  return ok(toSupplier(await saveSupplier(await body(req, supplierInput), id)));
});

export const DELETE = handler<{ id: string }>(async (_req, { id }) => {
  await requireAdmin();
  await deleteSupplier(id);
  return ok({ deleted: id });
});
