import { body, handler, ok } from '@/server/http';
import { toTicket } from '@/server/mappers';
import { createTicket, ticketInput } from '@/server/services/accounts';
import { requireSeller } from '@/server/session';

export const POST = handler(async (req) => {
  const seller = await requireSeller();
  return ok(toTicket(await createTicket(seller, await body(req, ticketInput))), 201);
});
