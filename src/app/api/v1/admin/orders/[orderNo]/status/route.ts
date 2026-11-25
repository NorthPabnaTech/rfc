import { body, handler, ok } from '@/server/http';
import { toOrder } from '@/server/mappers';
import { orderStatusSchema, updateOrderStatus } from '@/server/services/orders';
import { requireAdmin } from '@/server/session';

export const PATCH = handler<{ orderNo: string }>(async (req, { orderNo }) => {
  await requireAdmin();
  const order = await updateOrderStatus(orderNo, await body(req, orderStatusSchema));
  return ok(toOrder(order.toObject()));
});
