import 'server-only';

import Pusher from 'pusher';

import { serverEnv } from '@lib/env';
import { logger } from '@lib/utils';

import { userChannel } from './channels';

/**
 * Pusher Channels server client. Vercel functions can't hold WebSocket
 * connections, so a hosted socket service carries the live push; the
 * notifications themselves are stored in MongoDB.
 */
let client: Pusher | null | undefined;

function pusher(): Pusher | null {
  if (client !== undefined) return client;
  const { PUSHER_APP_ID, PUSHER_SECRET, NEXT_PUBLIC_PUSHER_KEY, NEXT_PUBLIC_PUSHER_CLUSTER } =
    serverEnv;
  client =
    PUSHER_APP_ID && PUSHER_SECRET && NEXT_PUBLIC_PUSHER_KEY && NEXT_PUBLIC_PUSHER_CLUSTER
      ? new Pusher({
          appId: PUSHER_APP_ID,
          key: NEXT_PUBLIC_PUSHER_KEY,
          secret: PUSHER_SECRET,
          cluster: NEXT_PUBLIC_PUSHER_CLUSTER,
          useTLS: true,
        })
      : null;
  return client;
}

export const realtimeEnabled = () => pusher() !== null;

/**
 * Sends `event` to each user's private channel. Never throws: a failed push
 * only means the bell picks the notification up on its next refresh.
 */
export async function publishToUsers(userIds: string[], event: string, data: unknown) {
  const p = pusher();
  if (!p || userIds.length === 0) return;
  const channels = userIds.map(userChannel);
  try {
    // Pusher accepts at most 100 channels per trigger.
    for (let i = 0; i < channels.length; i += 100) {
      await p.trigger(channels.slice(i, i + 100), event, data);
    }
  } catch (error) {
    logger.error('Realtime publish failed:', error);
  }
}

/** Signs a private-channel subscription for the Pusher browser client. */
export function authorizeChannel(socketId: string, channel: string) {
  const p = pusher();
  if (!p) throw new Error('Realtime is not configured.');
  return p.authorizeChannel(socketId, channel);
}
