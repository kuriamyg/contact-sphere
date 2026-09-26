/*
 * Contact Sphere service worker (Phases 10a–b).
 *
 * When a page cannot be loaded because the device is offline, it shows the
 * offline app (public/offline.html), which reads the copy of the owner's
 * contacts that the signed-in app saved on this device — if the owner
 * switched that on.
 *
 * Morning reminders (Phase 11): a Web Push message shows one notification
 * ("Today: 2 follow-ups.") — counts only, never a name — and tapping it
 * opens Today.
 *
 * Privacy: the worker itself caches only the offline app's own files and
 * the icon — never a signed-in page and never any contact. Every other
 * request, and every form submission, goes straight to the network.
 */
const CACHE = 'cs-offline-v3';
const OFFLINE_URL = '/offline.html';
const FILES = [
  OFFLINE_URL,
  '/offline-app.js',
  '/offline-app.css',
  '/icons/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // The offline app's own files, whenever they are asked for.
  if (
    url.origin === self.location.origin &&
    FILES.includes(url.pathname) &&
    url.pathname !== OFFLINE_URL
  ) {
    event.respondWith(
      caches.match(url.pathname).then((hit) => hit || fetch(req)),
    );
    return;
  }
  if (req.mode !== 'navigate') return;
  event.respondWith(
    fetch(req).catch(() =>
      caches.match(OFFLINE_URL).then(
        (cached) =>
          cached ||
          new Response('You are offline.', {
            status: 503,
            headers: { 'content-type': 'text/plain; charset=utf-8' },
          }),
      ),
    ),
  );
});

self.addEventListener('push', (event) => {
  let msg = {};
  try {
    msg = event.data ? event.data.json() : {};
  } catch {
    msg = {};
  }
  const url =
    typeof msg.url === 'string' && msg.url.startsWith('/') ? msg.url : '/today';
  event.waitUntil(
    self.registration.showNotification(
      typeof msg.title === 'string' ? msg.title : 'Contact Sphere',
      {
        body: typeof msg.body === 'string' ? msg.body : 'Open Today.',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: typeof msg.tag === 'string' ? msg.tag : 'today',
        data: { url },
      },
    ),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = event.notification.data?.url || '/today';
  const target = new URL(path, self.location.origin).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) => {
        for (const w of windows) {
          if (new URL(w.url).origin === self.location.origin) {
            return w.focus().then(() => w.navigate(target));
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});
