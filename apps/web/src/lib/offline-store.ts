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
 * Removes everything: the copy, changes waiting to be sent, and the switch.
 * Used when the owner signs out. Never throws.
 */
export function wipe(): void {
  try {
    localStorage.removeItem(FLAG);
  } catch {
    // Storage blocked: nothing was stored either.
  }
  try {
    indexedDB.deleteDatabase(DB_NAME);
  } catch {
    // Same.
  }
}

/**
 * The sign-in page and a 401: remove the copy, but keep the switch and any
 * changes still waiting — they belong to one account and are sent only if
 * that same account signs in again (the server checks).
 */
export async function wipeCopyOnly(): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete('snapshot');
      tx.objectStore(STORE).delete('info');
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {
    // Nothing stored.
  }
}

/** Changes made offline, waiting to be sent (written by offline-app.js). */
export interface Queue {
  ownerId: string;
  ops: { opId: string }[];
}

async function get<T>(key: string): Promise<T | null> {
  try {
    const db = await open();
    const v = await new Promise<T | null>((resolve) => {
      const req = db.transaction(STORE).objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    });
    db.close();
    return v;
  } catch {
    return null;
  }
}

export async function pendingCount(): Promise<number> {
  return (await get<Queue>('queue'))?.ops.length ?? 0;
}

export interface FlushResult {
  sent: number;
  rejected: string[];
}

/**
 * Sends changes made offline. Keeps the ones to retry; drops the ones the
 * server refused (and says why); drops all if another account is signed in.
 */
export async function flushQueue(): Promise<FlushResult> {
  const queue = await get<Queue>('queue');
  if (!queue || queue.ops.length === 0) return { sent: 0, rejected: [] };
  try {
    const res = await fetch('/offline-sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ownerId: queue.ownerId, ops: queue.ops }),
    });
    if (res.status === 409) {
      await put('queue', { ownerId: queue.ownerId, ops: [] });
      return {
        sent: 0,
        rejected: ['Changes made by another account were discarded.'],
      };
    }
    if (!res.ok) return { sent: 0, rejected: [] };
    const { results } = (await res.json()) as {
      results: { opId: string; status: string; message?: string }[];
    };
    const keep = new Set(
      results.filter((r) => r.status === 'retry').map((r) => r.opId),
    );
    await put('queue', {
      ownerId: queue.ownerId,
      ops: queue.ops.filter((o) => keep.has(o.opId)),
    });
    return {
      sent: results.filter((r) => r.status === 'ok').length,
      rejected: results
        .filter((r) => r.status === 'rejected')
        .map((r) => r.message ?? 'A change was not accepted.'),
    };
  } catch {
    return { sent: 0, rejected: [] };
  }
}

export type SyncResult = 'saved' | 'signed-out' | 'failed';

/** Downloads a fresh copy and stores it. A 401 means signed out: wipe. */
export async function syncNow(): Promise<SyncResult> {
  try {
    await flushQueue();
    const prev = await readInfo();
    const res = await fetch('/offline-data', {
      cache: 'no-store',
      headers: prev?.etag ? { 'if-none-match': prev.etag } : {},
    });
    if (res.status === 401) {
      await wipeCopyOnly();
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
