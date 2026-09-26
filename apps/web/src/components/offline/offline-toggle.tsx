'use client';

import { useEffect, useState } from 'react';

import {
  FLAG,
  isOn,
  readInfo,
  type StoredCopy,
  syncNow,
  wipe,
} from '@/lib/offline-store';

const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

function ago(iso: string): string {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

/** "Keep a copy on this phone": on/off, with what is stored and when. */
export function OfflineToggle() {
  const [on, setOn] = useState<boolean | null>(null);
  const [info, setInfo] = useState<StoredCopy | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Decided after mount: the server cannot see this device's storage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOn(isOn());
    void readInfo().then(setInfo);
  }, []);

  if (on === null) return null;

  const turnOn = async () => {
    setBusy(true);
    setError(null);
    try {
      localStorage.setItem(FLAG, 'on');
    } catch {
      setError('This browser does not allow saving data (private mode?).');
      setBusy(false);
      return;
    }
    const r = await syncNow();
    if (r === 'saved') {
      setOn(true);
      setInfo(await readInfo());
    } else {
      wipe();
      setOn(false);
      setError(
        r === 'signed-out'
          ? 'You are signed out. Sign in again, then switch this on.'
          : 'Could not download the copy. Check your connection and try again.',
      );
    }
    setBusy(false);
  };

  const refresh = async () => {
    setBusy(true);
    setError(null);
    const r = await syncNow();
    if (r === 'saved') setInfo(await readInfo());
    else setError('Could not refresh now; your last copy is still there.');
    setBusy(false);
  };

  const turnOff = () => {
    wipe();
    setOn(false);
    setInfo(null);
  };

  const button =
    'rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none disabled:opacity-60';

  return (
    <div className="space-y-3">
      {on && info ? (
        <p className="text-sm" role="status">
          <strong>On.</strong> {info.contacts}{' '}
          {info.contacts === 1 ? 'contact' : 'contacts'} ({kb(info.bytes)})
          saved on this phone, updated {ago(info.savedAt)}. It refreshes by
          itself when you have data.
        </p>
      ) : (
        <p className="text-sm text-muted">
          Off. Without data you only see a “You’re offline” page.
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700 dark:text-red-300" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {on ? (
          <>
            <button
              type="button"
              onClick={refresh}
              disabled={busy}
              className={button}
            >
              {busy ? 'Updating…' : 'Update now'}
            </button>
            <button
              type="button"
              onClick={turnOff}
              disabled={busy}
              className={button}
            >
              Turn off and delete the copy
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={turnOn}
            disabled={busy}
            className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90 focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Keep a copy on this phone'}
          </button>
        )}
      </div>
    </div>
  );
}

/** Wipes the copy the moment a sign-out form is submitted. */
export function WipeOnSubmit({ children }: { children: React.ReactNode }) {
  return (
    <div
      onSubmitCapture={() => {
        wipe();
      }}
    >
      {children}
    </div>
  );
}
