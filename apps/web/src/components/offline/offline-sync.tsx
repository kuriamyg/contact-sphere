'use client';

import { useEffect } from 'react';

import { isOn, readInfo, REFRESH_MS, syncNow, wipe } from '@/lib/offline-store';

/**
 * Keeps this device's offline copy fresh while the app is open — only if
 * the owner switched it on. Runs quietly; never blocks the page.
 */
export function OfflineSync() {
  useEffect(() => {
    const refresh = async () => {
      if (!isOn() || !navigator.onLine) return;
      const info = await readInfo();
      if (info && Date.now() - Date.parse(info.savedAt) < REFRESH_MS) return;
      await syncNow();
    };
    void refresh();
    window.addEventListener('online', refresh);
    return () => window.removeEventListener('online', refresh);
  }, []);
  return null;
}

/**
 * On the sign-in pages nobody is signed in on this device, so no copy may
 * stay behind (a session that expired, a wipe that was interrupted). The
 * owner's copy comes back on its own after signing in, if switched on.
 */
export function OfflineGuard() {
  useEffect(() => {
    wipe({ keepSwitch: true });
  }, []);
  return null;
}
