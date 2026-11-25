import { NextRequest } from 'next/server';
import { z } from 'zod';

import { SupportTicketModel, connectDB } from '@/database';
import {
  requireReseller,
  resellerError,
  resellerJson,
  resellerOptionsResponse,
} from '@lib/auth/reseller-auth';
import { TICKET_PRIORITIES } from '@lib/constants';
import { AppError } from '@lib/errors';
import { createSupportTicket } from '@/services/resellers';

const createTicketSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  category: z.string().trim().max(60).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  message: z.string().trim().min(5).max(4000),
  orderNumber: z.string().trim().max(40).optional(),
});

export function OPTIONS() {
  return resellerOptionsResponse();
}

export async function GET(req: NextRequest) {
  const auth = await requireReseller(req);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const status = req.nextUrl.searchParams.get('status');
    const filter: Record<string, unknown> = { reseller: auth.reseller._id };
    if (status) filter.status = status;

    const tickets = await SupportTicketModel.find(filter).sort({ lastReplyAt: -1 }).lean();
    return resellerJson({
      ok: true,
      data: tickets.map((t) => ({
        id: String(t._id),
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        category: t.category,
        priority: t.priority,
        status: t.status,
        orderNumber: t.orderNumber ?? null,
        messageCount: t.messages.length,
        lastReplyAt: t.lastReplyAt,
        createdAt: t.createdAt,
      })),
    });
  } catch {
    return resellerError('Failed to load support tickets.', 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireReseller(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = createTicketSchema.safeParse(body);
    if (!parsed.success) {
      return resellerError(parsed.error.issues[0]?.message ?? 'Invalid ticket payload.', 400);
    }

    const ticket = await createSupportTicket({
      resellerId: String(auth.reseller._id),
      resellerName: auth.reseller.shopName || auth.reseller.name,
      subject: parsed.data.subject,
      category: parsed.data.category,
      priority: parsed.data.priority,
      message: parsed.data.message,
      orderNumber: parsed.data.orderNumber,
    });

    return resellerJson(
      {
        ok: true,
        data: {
          id: String(ticket._id),
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          status: ticket.status,
          createdAt: ticket.createdAt,
        },
      },
      201,
    );
  } catch (err) {
    if (err instanceof AppError) return resellerError(err.message, err.status);
    return resellerError('Failed to create support ticket.', 500);
  }
}
