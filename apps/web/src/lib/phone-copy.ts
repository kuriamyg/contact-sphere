/**
 * "Put my contacts on this phone" (P5c, ADR 0025): the Android app writes
 * them under its own "Contact Sphere" account. In a browser this is absent.
 */
export interface PhoneCopyContact {
  id: string;
  displayName: string;
  givenName: string | null;
  familyName: string | null;
  organization: string | null;
  jobTitle: string | null;
  phones: { number: string; label: string | null }[];
  emails: { address: string; label: string | null }[];
}

export interface WriteResult {
  added: number;
  updated: number;
  unchanged: number;
  removed: number;
}

interface Bridge {
  nativePromise?: (p: string, m: string, o: object) => Promise<unknown>;
}

const call = <T>(method: string, options: object = {}): Promise<T> => {
  const b = (globalThis as { Capacitor?: Bridge }).Capacitor;
  if (!b?.nativePromise) return Promise.reject(new Error('Not in the app'));
  return b.nativePromise('PhoneCopy', method, options) as Promise<T>;
};

export const phoneCopyCount = () =>
  call<{ count: number }>('status').then((r) => r.count);

export const writeToPhone = (contacts: PhoneCopyContact[]) =>
  call<WriteResult>('writeAll', { contacts });

export const removeFromPhone = () =>
  call<{ removed: number }>('removeAll').then((r) => r.removed);

/** "PERMISSION_DENIED" when the owner refused Android's prompt. */
export const deniedPermission = (e: unknown) =>
  (e as { code?: string })?.code === 'PERMISSION_DENIED';
