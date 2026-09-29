'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';

import { CloseIcon } from '@/components/icons';
import { useMessages } from '@/i18n/client';
import { fmt } from '@/i18n/format';
import { snoozed, snoozeKey } from '@/lib/backup-reminder';

const EVENT = 'cs:backup-snooze';

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** "Back up your contacts" on Today (C2); "Not now" for 30 days. */
export function BackupReminder({
  userId,
  due,
  last,
  now,
}: {
  userId: string;
  due: 'never' | 'old';
  /** The last backup's date, formatted, when there was one. */
  last: string | null;
  now: number;
}) {
  const t = useMessages().backup;
  const key = snoozeKey(userId);
  const hidden = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return snoozed(localStorage.getItem(key), now);
      } catch {
        return false;
      }
    },
    () => false,
  );
  if (hidden) return null;
  return (
    <section
      aria-labelledby="backup-reminder-title"
      data-testid="backup-reminder"
      className="relative space-y-3 rounded-2xl border border-border bg-surface p-4 pr-12"
    >
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(key, String(now));
          } catch {
            // Nowhere to remember it: it shows again next time.
          }
          window.dispatchEvent(new Event(EVENT));
        }}
        aria-label={t.notNow}
        className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <CloseIcon className="size-4" />
      </button>
      <div className="space-y-1">
        <h2 id="backup-reminder-title" className="font-semibold">
          {t.remindTitle}
        </h2>
        <p className="text-sm text-muted">
          {due === 'old' && last
            ? fmt(t.remindOld, { date: last })
            : t.remindNever}
        </p>
      </div>
      <Link
        href="/account#backup-heading"
        className="inline-flex rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        {t.remindCta}
      </Link>
    </section>
  );
}
