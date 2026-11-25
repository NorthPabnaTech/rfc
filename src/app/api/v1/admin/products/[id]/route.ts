import { body, handler, ok } from '@/server/http';
import { toProduct } from '@/server/mappers';
import { deleteProduct, productInput, saveProduct } from '@/server/services/catalog';
import { requireAdmin } from '@/server/session';

export const PUT = handler<{ id: string }>(async (req, { id }) => {
  await requireAdmin();
  return ok(toProduct(await saveProduct(await body(req, productInput), id)));
});

export const DELETE = handler<{ id: string }>(async (_req, { id }) => {
  await requireAdmin();
  await deleteProduct(id);
  return ok({ deleted: id });
});
