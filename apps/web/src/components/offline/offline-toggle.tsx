'use client';

import { useEffect, useState } from 'react';

import {
  FLAG,
  isOn,
  pendingCount,
  readInfo,
  type StoredCopy,
  syncNow,
  wipe,
} from '@/lib/offline-store';
import type { Messages } from '@/i18n/en';
import { useMessages } from '@/i18n/client';
import { fmt, plural } from '@/i18n/format';

type T = Messages['client']['offline'];

const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

function ago(iso: string, t: T): string {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return t.justNow;
  if (min < 60) return fmt(t.minAgo, { n: min });
  const h = Math.round(min / 60);
  return h < 24
    ? fmt(t.hoursAgo, { n: h })
    : fmt(t.daysAgo, { n: Math.round(h / 24) });
}

/** "Keep a copy on this phone": on/off, with what is stored and when. */
export function OfflineToggle() {
  const t = useMessages().offline;
  const [on, setOn] = useState<boolean | null>(null);
  const [info, setInfo] = useState<StoredCopy | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(0);

  useEffect(() => {
    // Decided after mount: the server cannot see this device's storage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOn(isOn());
    void readInfo().then(setInfo);
    void pendingCount().then(setWaiting);
  }, []);

  if (on === null) return null;

  const turnOn = async () => {
    setBusy(true);
    setError(null);
    try {
      localStorage.setItem(FLAG, 'on');
    } catch {
      setError(t.noStorage);
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
      setError(r === 'signed-out' ? t.signedOut : t.downloadFailed);
    }
    setBusy(false);
  };

  const refresh = async () => {
    setBusy(true);
    setError(null);
    const r = await syncNow();
    if (r === 'saved') setInfo(await readInfo());
    else setError(t.refreshFailed);
    setWaiting(await pendingCount());
    setBusy(false);
  };

  const turnOff = () => {
    if (waiting > 0 && !window.confirm(fmt(t.confirmDelete, { n: waiting }))) {
      return;
    }
    wipe();
    setOn(false);
    setInfo(null);
  };

  const button =
    'rounded-lg border border-border px-4 py-2.5 text-sm font-medium bg-surface hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none disabled:opacity-60';

  return (
    <div className="space-y-3">
      {on && info ? (
        <p className="text-sm" role="status">
          <strong>{t.on}</strong>{' '}
          {plural(info.contacts, t.onDetail, {
            size: kb(info.bytes),
            ago: ago(info.savedAt, t),
          })}
        </p>
      ) : (
        <p className="text-sm text-muted">{t.off}</p>
      )}
      {waiting > 0 && (
        <p className="text-sm font-medium" role="status">
          {plural(waiting, t.waiting)}
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
              {busy ? t.updating : t.updateNow}
            </button>
            <button
              type="button"
              onClick={turnOff}
              disabled={busy}
              className={button}
            >
              {t.turnOff}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={turnOn}
            disabled={busy}
            className="rounded-lg btn-primary px-4 py-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
          >
            {busy ? t.saving : t.keepCopy}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Wipes the copy the moment a sign-out form is submitted — after warning if
 * changes made without data have not been sent yet.
 */
export function WipeOnSubmit({ children }: { children: React.ReactNode }) {
  const t = useMessages().offline;
  const [waiting, setWaiting] = useState(0);
  useEffect(() => {
    void pendingCount().then(setWaiting);
  }, []);
  return (
    <div
      onSubmitCapture={(e) => {
        if (
          waiting > 0 &&
          !window.confirm(fmt(t.confirmSignOut, { n: waiting }))
        ) {
          e.preventDefault();
          return;
        }
        wipe();
      }}
    >
      {children}
    </div>
  );
}
