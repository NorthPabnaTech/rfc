import { body, handler, ok } from '@/server/http';
import { toProduct } from '@/server/mappers';
import { productInput, saveProduct } from '@/server/services/catalog';
import { requireAdmin } from '@/server/session';

export const POST = handler(async (req) => {
  await requireAdmin();
  return ok(toProduct(await saveProduct(await body(req, productInput))), 201);
});
