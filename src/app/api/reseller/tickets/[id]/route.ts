import { NextRequest } from 'next/server';

import { connectDB,SupportTicketModel } from '@/database';
import {
  requireReseller,
  resellerError,
  resellerJson,
  resellerOptionsResponse,
} from '@lib/auth/reseller-auth';

export function OPTIONS() {
  return resellerOptionsResponse();
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireReseller(req);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const { id } = await context.params;
    const ticket = await SupportTicketModel.findOne({
      _id: id,
      reseller: auth.reseller._id,
    }).lean();
    if (!ticket) return resellerError('Support ticket not found.', 404);

    return resellerJson({
      ok: true,
      data: {
        id: String(ticket._id),
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        orderNumber: ticket.orderNumber ?? null,
        messages: ticket.messages,
        lastReplyAt: ticket.lastReplyAt,
        createdAt: ticket.createdAt,
      },
    });
  } catch {
    return resellerError('Failed to load support ticket.', 500);
  }
}
