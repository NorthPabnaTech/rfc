'use server';

import { cookies } from 'next/headers';
import { z } from 'zod';

import {
  getNotificationFeed,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationsSeen,
  savePushSubscription,
} from '@/services/notifications';
import type { NotificationFeedDTO } from '@/types';
import { requireUser } from '@lib/auth/current-user';
import { type ActionResult, AppError, runAction } from '@lib/errors';
import { PUSH_COOKIE, userIdFromChannel } from '@lib/realtime/channels';
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

const pushSubscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
  userAgent: z.string().max(300).optional(),
});

/**
 * Registers this browser for system notifications. Its id goes in a cookie so
 * `logoutAction` can unregister the browser on sign-out.
 */
export async function savePushSubscriptionAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const id = await savePushSubscription(user.id, pushSubscriptionSchema.parse(input));
    const store = await cookies();
    store.set(PUSH_COOKIE, id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
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
