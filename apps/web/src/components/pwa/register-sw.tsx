'use client';

import { useEffect } from 'react';

/** Registers the offline-page service worker (public/sw.js) in production. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Best effort: the app works the same without it.
    });
  }, []);
  return null;
}
