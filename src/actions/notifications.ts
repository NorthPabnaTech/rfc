'use server';

import { z } from 'zod';

import {
  getNotificationFeed,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationsSeen,
} from '@/services/notifications';
import type { NotificationFeedDTO } from '@/types';
import { requireUser } from '@lib/auth/current-user';
import { type ActionResult, AppError, runAction } from '@lib/errors';
import { userIdFromChannel } from '@lib/realtime/channels';
import { authorizeChannel } from '@lib/realtime/server';
import { objectId } from '@lib/validators/common';

export async function getNotificationsAction(): Promise<ActionResult<NotificationFeedDTO>> {
  return runAction(async () => {
    const user = await requireUser();
    return getNotificationFeed(user.id);
  });
}

export async function markNotificationsSeenAction(): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    await markNotificationsSeen(user.id);
    return undefined;
  });
}

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    await markNotificationRead(user.id, objectId.parse(id));
    return undefined;
  });
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    await markAllNotificationsRead(user.id);
    return undefined;
  });
}

const channelAuthSchema = z.object({
  socketId: z.string().regex(/^\d+\.\d+$/, 'Invalid socket id'),
  channelName: z.string().min(1).max(200),
});

/**
 * Signs a Pusher private-channel subscription. A user may only subscribe to
 * their own channel, so nobody can listen to another account's notifications.
 */
export async function authorizeRealtimeAction(
  input: unknown,
): Promise<ActionResult<{ auth: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { socketId, channelName } = channelAuthSchema.parse(input);
    if (userIdFromChannel(channelName) !== user.id) {
      throw new AppError('You can only subscribe to your own notifications.', 403);
    }
    return { auth: authorizeChannel(socketId, channelName).auth };
  });
}
