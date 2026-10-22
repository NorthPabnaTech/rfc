/* RFC Gadget service worker — shows Web Push notifications as system
 * notifications (even when no tab of the site is open) and opens the
 * notification's link when it is clicked. Sent by src/lib/realtime/push.ts. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'RFC Gadget', {
      body: data.body || '',
      icon: '/icon.png',
      badge: '/icon.png',
      // Same id → replaces instead of stacking a duplicate.
      tag: data.id || undefined,
      data: { link: data.link || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.link || '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const tab = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (tab) {
        await tab.focus();
        return tab.navigate(url);
      }
      return self.clients.openWindow(url);
    })(),
  );
});
