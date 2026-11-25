import 'server-only';

import { Types } from 'mongoose';
import { z } from 'zod';

import { AppError } from '@lib/errors';
import { BD_PHONE, expenseSchema, profileSchema, ticketSchema } from '@lib/validators/reseller';

import type { SellerStatus, TicketStatus } from '@/types/platform';

import { nextId } from '../db';
import { serverT } from '../http';
import { ExpenseModel, TicketModel, UserModel } from '../models';
import { notify } from './notify';

/* ─── Sellers (admin) ────────────────────────────────────────────────── */

export const sellerStatusInput = z.object({ status: z.enum(['active', 'pending', 'inactive', 'suspended']) });

export async function setSellerStatus(id: string, status: SellerStatus) {
  const user = await UserModel.findOneAndUpdate({ _id: id, role: 'seller' }, { $set: { status } }, { new: true }).lean();
  if (!user) throw new AppError('Seller not found.', 404);
  await notify({ audience: 'seller', sellerId: id, kind: 'account', title: `Account ${status}`, body: `Your seller account status is now ${status}.` });
  return user;
}

/* ─── Profiles ───────────────────────────────────────────────────────── */

export const sellerProfileInput = profileSchema(serverT);

export async function updateSellerProfile(id: string, input: z.output<typeof sellerProfileInput>) {
  const clash = await UserModel.exists({ email: input.email.toLowerCase(), _id: { $ne: id } });
  if (clash) throw new AppError('That email is already in use.', 409);
  return UserModel.findByIdAndUpdate(
    id,
    {
      $set: {
        name: input.name,
        shopName: input.shopName,
        email: input.email.toLowerCase(),
        phone: input.phone,
        district: input.district,
        address: input.address,
        payout: { method: input.payoutMethod, account: input.payoutAccount },
      },
    },
    { new: true },
  ).lean();
}

export const adminProfileInput = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().refine((v) => v === '' || BD_PHONE.test(v.replace(/-/g, '')), serverT('common.invalidPhone')),
});

export async function updateAdminProfile(id: string, input: z.output<typeof adminProfileInput>) {
  const clash = await UserModel.exists({ email: input.email, _id: { $ne: id } });
  if (clash) throw new AppError('That email is already in use.', 409);
  return UserModel.findByIdAndUpdate(id, { $set: input }, { new: true }).lean();
}

/* ─── Support tickets ────────────────────────────────────────────────── */

export const ticketInput = ticketSchema(serverT);

export async function createTicket(seller: { id: string; name: string }, input: z.output<typeof ticketInput>) {
  const ticketNo = await nextId('TKT', 2000);
  const doc = await TicketModel.create({ ...input, ticketNo, sellerId: new Types.ObjectId(seller.id) });
  await notify({ audience: 'admin', kind: 'account', title: `Support request ${ticketNo}`, body: `${seller.name}: ${input.subject}`, href: '/admin/support' });
  return doc.toObject();
}

export const ticketStatusInput = z.object({ status: z.enum(['open', 'in_progress', 'resolved']) });

export async function setTicketStatus(ticketNo: string, status: TicketStatus) {
  const doc = await TicketModel.findOneAndUpdate({ ticketNo }, { $set: { status } }, { new: true }).lean();
  if (!doc) throw new AppError('Ticket not found.', 404);
  return doc;
}

/* ─── Expenses (admin) ───────────────────────────────────────────────── */

export const expenseInput = expenseSchema(serverT);

export async function addExpense(input: z.output<typeof expenseInput>) {
  return (await ExpenseModel.create({ ...input, date: new Date(input.date) })).toObject();
}

export async function deleteExpense(id: string) {
  await ExpenseModel.deleteOne({ _id: id });
}
