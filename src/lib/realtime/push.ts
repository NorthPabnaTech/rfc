import 'server-only';

import webpush from 'web-push';

import { connectDB, PushSubscriptionModel } from '@/database';
import { serverEnv } from '@lib/env';
import { logger } from '@lib/utils';

/** What the service worker (`public/sw.js`) turns into a system notification. */
export type PushPayload = { id: string; title: string; body: string; link: string };

let configured: boolean | undefined;

export function pushEnabled(): boolean {
  if (configured !== undefined) return configured;
  const { NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = serverEnv;
  configured = Boolean(NEXT_PUBLIC_VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
  if (configured) {
    webpush.setVapidDetails(VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
  }
  return configured;
}

/**
 * Sends a system notification to every browser the user enabled them on.
 * Never throws; subscriptions the push service reports as gone are deleted.
 */
export async function pushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!pushEnabled()) return;
  try {
    await connectDB();
    const subs = await PushSubscriptionModel.find({ user: userId }).lean();
    const body = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, body, {
            TTL: 60 * 60 * 24,
            urgency: 'high',
          });
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await PushSubscriptionModel.deleteOne({ _id: s._id });
          } else {
            logger.error('Web push failed:', error);
          }
        }
      }),
    );
  } catch (error) {
    logger.error('Web push failed:', error);
  }
}
