import { body, handler, ok } from '@/server/http';
import { toSupplier } from '@/server/mappers';
import { saveSupplier, supplierInput } from '@/server/services/catalog';
import { requireAdmin } from '@/server/session';

export const POST = handler(async (req) => {
  await requireAdmin();
  return ok(toSupplier(await saveSupplier(await body(req, supplierInput))), 201);
});
