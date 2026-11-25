'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  adminAdjustResellerWallet,
  approveOrRejectResellerDeposit,
  processResellerWithdrawal,
  replySupportTicket,
  toggleResellerActive,
  updateSupportTicketStatus,
} from '@/services/resellers';
import { requireAdmin } from '@lib/auth/current-user';
import { TICKET_STATUSES, type TicketStatus } from '@lib/constants';
import { type ActionResult, runAction } from '@lib/errors';
import { objectId } from '@lib/validators/common';

export async function toggleResellerActiveAction(
  resellerId: string,
  isActive: boolean,
): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireAdmin();
    objectId.parse(resellerId);
    await toggleResellerActive(resellerId, isActive);
    revalidatePath('/admin/resellers');
    revalidatePath(`/admin/resellers/${resellerId}`);
  });
}

const adjustWalletSchema = z.object({
  resellerId: objectId,
  direction: z.enum(['credit', 'debit']),
  amount: z.coerce.number().positive(),
  note: z.string().trim().min(2).max(300),
});

export async function adjustResellerWalletAction(
  input: z.infer<typeof adjustWalletSchema>,
): Promise<ActionResult<void>> {
  return runAction(async () => {
    const admin = await requireAdmin();
    const parsed = adjustWalletSchema.parse(input);
    await adminAdjustResellerWallet({
      ...parsed,
      adminId: admin.id,
    });
    revalidatePath('/admin/resellers');
    revalidatePath(`/admin/resellers/${parsed.resellerId}`);
    revalidatePath('/admin/resellers/transactions');
  });
}

export async function processDepositAction(
  txId: string,
  action: 'approve' | 'reject',
  note?: string,
): Promise<ActionResult<void>> {
  return runAction(async () => {
    const admin = await requireAdmin();
    objectId.parse(txId);
    await approveOrRejectResellerDeposit(txId, action, admin.id, note);
    revalidatePath('/admin/resellers');
    revalidatePath('/admin/resellers/transactions');
  });
}

export async function processWithdrawalAction(
  txId: string,
  action: 'approve' | 'reject',
  note?: string,
): Promise<ActionResult<void>> {
  return runAction(async () => {
    const admin = await requireAdmin();
    objectId.parse(txId);
    await processResellerWithdrawal(txId, action, admin.id, note);
    revalidatePath('/admin/resellers');
    revalidatePath('/admin/resellers/transactions');
  });
}

export async function replySupportTicketAction(
  ticketId: string,
  message: string,
): Promise<ActionResult<void>> {
  return runAction(async () => {
    const admin = await requireAdmin();
    objectId.parse(ticketId);
    const trimmed = message.trim();
    if (!trimmed) throw new Error('Reply message is required.');
    await replySupportTicket({
      ticketId,
      senderRole: 'admin',
      senderName: admin.name || 'Admin',
      message: trimmed,
    });
    revalidatePath('/admin/resellers/tickets');
  });
}

export async function updateSupportTicketStatusAction(
  ticketId: string,
  status: TicketStatus,
): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireAdmin();
    objectId.parse(ticketId);
    z.enum(TICKET_STATUSES).parse(status);
    await updateSupportTicketStatus(ticketId, status);
    revalidatePath('/admin/resellers/tickets');
  });
}
