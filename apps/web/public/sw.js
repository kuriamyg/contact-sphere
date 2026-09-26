/*
 * Contact Sphere service worker (Phases 10a–b).
 *
 * When a page cannot be loaded because the device is offline, it shows the
 * offline app (public/offline.html), which reads the copy of the owner's
 * contacts that the signed-in app saved on this device — if the owner
 * switched that on.
 *
 * Privacy: the worker itself caches only the offline app's own files and
 * the icon — never a signed-in page and never any contact. Every other
 * request, and every form submission, goes straight to the network.
 */
const CACHE = 'cs-offline-v2';
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
