import { body, handler, ok } from '@/server/http';
import { toSeller } from '@/server/mappers';
import { sellerProfileInput, updateSellerProfile } from '@/server/services/accounts';
import { requireSeller } from '@/server/session';

export const PATCH = handler(async (req) => {
  const seller = await requireSeller();
  return ok(toSeller((await updateSellerProfile(seller.id, await body(req, sellerProfileInput)))!));
});
