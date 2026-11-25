import { body, handler, ok } from '@/server/http';
import { toTicket } from '@/server/mappers';
import { setTicketStatus, ticketStatusInput } from '@/server/services/accounts';
import { requireAdmin } from '@/server/session';

export const PATCH = handler<{ ticketNo: string }>(async (req, { ticketNo }) => {
  await requireAdmin();
  return ok(toTicket(await setTicketStatus(ticketNo, (await body(req, ticketStatusInput)).status)));
});
