/**
 * Realtime channel names, shared by the server (publishing + authorizing) and
 * the browser (subscribing). Private channels (`private-` prefix) require a
 * signed authorization, so a user can only ever subscribe to their own.
 */
const USER_CHANNEL_PREFIX = 'private-user-';

export function userChannel(userId: string): string {
  return `${USER_CHANNEL_PREFIX}${userId}`;
}

/** The user id a private user channel belongs to, or null for any other name. */
export function userIdFromChannel(channel: string): string | null {
  return channel.startsWith(USER_CHANNEL_PREFIX) ? channel.slice(USER_CHANNEL_PREFIX.length) : null;
}

/** Cookie holding this browser's Web Push subscription id (cleared on sign-out). */
export const PUSH_COOKIE = 'rfc_gadget_push';

/** VAPID public key for Web Push; `null` when system notifications are off. */
export function pushClientKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}

/** Browser-side config; `null` when realtime isn't configured. */
export function realtimeClientConfig(): { key: string; cluster: string } | null {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  return key && cluster ? { key, cluster } : null;
}
