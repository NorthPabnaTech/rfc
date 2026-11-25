import { body, handler, ok } from '@/server/http';
import { toSeller } from '@/server/mappers';
import { sellerStatusInput, setSellerStatus } from '@/server/services/accounts';
import { requireAdmin } from '@/server/session';

export const PATCH = handler<{ id: string }>(async (req, { id }) => {
  await requireAdmin();
  return ok(toSeller(await setSellerStatus(id, (await body(req, sellerStatusInput)).status)));
});
