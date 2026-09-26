/**
 * The offline copy on this device (Phase 10b), in the browser's IndexedDB.
 * The same database is read by public/offline-app.js when there is no
 * connection. Browser-only; every function is a safe no-op on failure.
 *
 * The copy exists only while the owner has switched it on (FLAG) and is
 * signed in: sign-out, "sign out everywhere" and any 401 wipe it.
 */
export const DB_NAME = 'cs-offline';
const STORE = 'kv';
export const FLAG = 'cs-offline';
/**
 * Check for changes at most this often while the app is open. A check that
 * finds nothing new costs well under 1 KB (HTTP 304).
 */
export const REFRESH_MS = 10 * 60 * 1000;

export interface StoredCopy {
  savedAt: string;
  bytes: number;
  contacts: number;
  /** Fingerprint of the copy, for "has anything changed?" checks. */
  etag?: string;
}

export const isOn = () => {
  try {
    return localStorage.getItem(FLAG) === 'on';
  } catch {
    return false;
  }
};

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('indexedDB'));
  });
}

async function put(key: string, value: unknown): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('indexedDB'));
  });
  db.close();
}

export async function readInfo(): Promise<StoredCopy | null> {
  try {
    const db = await open();
    const info = await new Promise<StoredCopy | null>((resolve) => {
      const req = db.transaction(STORE).objectStore(STORE).get('info');
      req.onsuccess = () => resolve((req.result as StoredCopy) ?? null);
      req.onerror = () => resolve(null);
    });
    db.close();
    return info;
  } catch {
    return null;
  }
}

/**
 * Removes the copy — and the switch too, unless `keepSwitch` (the sign-in
 * page: the owner's choice for this device stays; the data does not).
 * Never throws.
 */
export function wipe({ keepSwitch = false } = {}): void {
  if (!keepSwitch) {
    try {
      localStorage.removeItem(FLAG);
    } catch {
      // Storage blocked: nothing was stored either.
    }
  }
  try {
    indexedDB.deleteDatabase(DB_NAME);
  } catch {
    // Same.
  }
}

export type SyncResult = 'saved' | 'signed-out' | 'failed';

/** Downloads a fresh copy and stores it. A 401 means signed out: wipe. */
export async function syncNow(): Promise<SyncResult> {
  try {
    const prev = await readInfo();
    const res = await fetch('/offline-data', {
      cache: 'no-store',
      headers: prev?.etag ? { 'if-none-match': prev.etag } : {},
    });
    if (res.status === 401) {
      wipe();
      return 'signed-out';
    }
    if (res.status === 304 && prev) {
      await put('info', { ...prev, savedAt: new Date().toISOString() });
      return 'saved';
    }
    if (!res.ok) return 'failed';
    const text = await res.text();
    const snapshot = JSON.parse(text) as { contacts: unknown[] };
    if (!isOn()) return 'failed'; // switched off meanwhile
    await put('snapshot', snapshot);
    await put('info', {
      savedAt: new Date().toISOString(),
      bytes: text.length,
      contacts: snapshot.contacts.length,
      etag: res.headers.get('etag') ?? undefined,
    } satisfies StoredCopy);
    return 'saved';
  } catch {
    return 'failed';
  }
}
