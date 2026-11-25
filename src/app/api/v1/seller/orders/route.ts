import { body, handler, ok } from '@/server/http';
import { toSellerOrder } from '@/server/mappers';
import { placeOrder, placeOrderSchema } from '@/server/services/orders';
import { requireSeller } from '@/server/session';

export const POST = handler(async (req) => {
  const seller = await requireSeller();
  const order = await placeOrder(seller, await body(req, placeOrderSchema));
  return ok(toSellerOrder(order.toObject()), 201);
});
