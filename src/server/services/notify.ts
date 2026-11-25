import 'server-only';

import { Types } from 'mongoose';

import type { NotificationKind, Role } from '@/types/platform';

import type { Session } from '../db';
import { NotificationModel } from '../models';

/** Stores an in-app notification. Never throws — a failed notice must not fail the action. */
export async function notify(
  n: { audience: Role; sellerId?: string; kind: NotificationKind; title: string; body?: string; href?: string },
  session?: Session,
): Promise<void> {
  try {
    await NotificationModel.create(
      [{ ...n, sellerId: n.sellerId ? new Types.ObjectId(n.sellerId) : undefined, read: false }],
      { session },
    );
  } catch (error) {
    console.error('[notify]', error);
  }
}

export async function markRead(user: { id: string; role: Role }, ids: 'all' | string[]) {
  const scope =
    user.role === 'admin'
      ? { audience: 'admin' as const }
      : { audience: 'seller' as const, sellerId: new Types.ObjectId(user.id) };
  const filter =
    ids === 'all' ? scope : { ...scope, _id: { $in: ids.filter((i) => Types.ObjectId.isValid(i)) } };
  await NotificationModel.updateMany(filter, { $set: { read: true } });
}
