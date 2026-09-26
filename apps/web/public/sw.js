/*
 * Contact Sphere service worker (Phase 10a).
 *
 * It does one thing: when a page cannot be loaded because the device is
 * offline, it shows a friendly offline page instead of the browser's error.
 *
 * Privacy: it never stores contacts or any signed-in page. Only the offline
 * page and the app icon are cached. Everything else — including every form
 * submission — goes straight to the network, untouched.
 */
const CACHE = 'cs-offline-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, '/icons/icon-192.png']))
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
  if (req.method !== 'GET' || req.mode !== 'navigate') return;
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
