/// <reference lib="webworker" />
// Custom service worker (vite-plugin-pwa "injectManifest" strategy) --
// excluded from tsconfig.app.json (see that file) since this runs in the
// ServiceWorkerGlobalScope, not a browser window; Vite/esbuild bundles it
// directly without needing tsc to type-check it first.
//
// Deliberately only precaches the static build manifest below -- there is
// no runtime-caching route for anything else, which means API/WebSocket
// requests are never intercepted by this service worker at all and always
// go straight to the network. This is a ledger app: no financial response
// should ever be served from a cache.
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

self.skipWaiting();
self.addEventListener('activate', () => {
  void self.clients.claim();
});

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// iOS 16.4+ only delivers push to an installed (home-screen) PWA; every
// other platform (Android/desktop Chrome, Firefox, etc.) supports it
// regardless of install state. Either way, this is the fallback of last
// resort -- see PWA Phase 2 for the email fallback that doesn't depend on
// push working at all.
self.addEventListener('push', (event: PushEvent) => {
  let payload: PushPayload = { title: 'Scribe', body: '' };
  if (event.data) {
    try {
      payload = event.data.json() as PushPayload;
    } catch {
      payload = { title: 'Scribe', body: event.data.text() };
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Scribe', {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: payload.data ?? {},
    }),
  );
});

// Clicking the system notification focuses an already-open tab if one
// exists, otherwise opens the notifications page -- the one place every
// notification type is already listed, rather than guessing a per-type
// deep link from action_data.
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus();
          return;
        }
      }
      await self.clients.openWindow('/notifications');
    })(),
  );
});
