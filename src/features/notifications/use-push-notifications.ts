'use client';

import * as React from 'react';

import { savePushSubscriptionAction } from '@/actions/notifications';

export type PushState = 'unsupported' | 'default' | 'granted' | 'denied';

const SW_URL = '/sw.js';

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function subscribe(vapidKey: string): Promise<void> {
  const reg = await navigator.serviceWorker.register(SW_URL);
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    }));
  const json = sub.toJSON();
  await savePushSubscriptionAction({
    endpoint: json.endpoint,
    keys: json.keys,
    userAgent: navigator.userAgent.slice(0, 300),
  });
}

/**
 * System (Web Push) notifications for the signed-in user. Once permission is
 * granted, this browser's subscription is (re)saved on every page load, so it
 * follows whoever is signed in. `enable()` must run from a click — browsers
 * only show the permission prompt in response to a user gesture.
 */
export function usePushNotifications(vapidKey: string | null) {
  // Bumped after the permission prompt so the snapshot is re-read.
  const [, setPrompted] = React.useState(0);
  const permission = React.useSyncExternalStore(
    subscribePermission,
    readPermission,
    () => 'unsupported' as const,
  );
  const state: PushState = vapidKey ? permission : 'unsupported';

  React.useEffect(() => {
    if (vapidKey && state === 'granted') {
      subscribe(vapidKey).catch((e) => console.warn('[push] subscribe failed', e));
    }
  }, [vapidKey, state]);

  const enable = React.useCallback(async () => {
    if (!vapidKey) return;
    const result = await Notification.requestPermission();
    setPrompted((n) => n + 1);
    if (result === 'granted') await subscribe(vapidKey);
  }, [vapidKey]);

  return { state, enable };
}

function readPermission(): PushState {
  const supported =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  return supported ? Notification.permission : 'unsupported';
}

/** Re-render when the user changes the site's permission in browser settings. */
function subscribePermission(onChange: () => void): () => void {
  let status: PermissionStatus | null = null;
  let cancelled = false;
  navigator.permissions
    ?.query({ name: 'notifications' })
    .then((s) => {
      if (cancelled) return;
      status = s;
      s.addEventListener('change', onChange);
    })
    .catch(() => {});
  return () => {
    cancelled = true;
    status?.removeEventListener('change', onChange);
  };
}
