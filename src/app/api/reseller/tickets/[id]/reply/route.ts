import { NextRequest } from 'next/server';
import { z } from 'zod';

import { replySupportTicket } from '@/services/resellers';
import {
  requireReseller,
  resellerError,
  resellerJson,
  resellerOptionsResponse,
} from '@lib/auth/reseller-auth';
import { AppError } from '@lib/errors';

const replySchema = z.object({
  message: z.string().trim().min(1).max(4000),
});

export function OPTIONS() {
  return resellerOptionsResponse();
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireReseller(req);
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = replySchema.safeParse(body);
    if (!parsed.success) {
      return resellerError(parsed.error.issues[0]?.message ?? 'Message is required.', 400);
    }

    const ticket = await replySupportTicket({
      ticketId: id,
      resellerId: String(auth.reseller._id),
      senderRole: 'reseller',
      senderName: auth.reseller.shopName || auth.reseller.name,
      message: parsed.data.message,
    });

    return resellerJson({
      ok: true,
      data: {
        id: String(ticket._id),
        status: ticket.status,
        messages: ticket.messages,
      },
    });
  } catch (err) {
    if (err instanceof AppError) return resellerError(err.message, err.status);
    return resellerError('Failed to post reply.', 500);
  }
}
