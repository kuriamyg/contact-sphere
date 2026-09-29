'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';

import { CloseIcon } from '@/components/icons';
import { useMessages } from '@/i18n/client';
import { fmt } from '@/i18n/format';
import { dismissKey, type PlanNotice } from '@/lib/plan-notice';

const EVENT = 'cs:plan-notice';

function read(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/**
 * "Your free Plus ends in 3 days" before Plus ends, "You're on the free
 * plan now" for two weeks after (C1). One tap to the plan; "Not now" hides
 * it until tomorrow on this device.
 */
export function PlanBanner({
  userId,
  notice,
  date,
  now,
}: {
  userId: string;
  notice: PlanNotice;
  /** The end date, already formatted for the reader's language. */
  date: string;
  /** When the page was made (the same "today" as the server). */
  now: number;
}) {
  const t = useMessages().planNotice;
  const key = dismissKey(userId, notice, now);
  const hidden = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => false,
  );
  if (hidden) return null;

  const ending = notice.kind === 'ending';
  const title = ending
    ? fmt(
        notice.daysLeft <= 0
          ? notice.paid
            ? t.paidToday
            : t.freeToday
          : notice.daysLeft === 1
            ? notice.paid
              ? t.paidTomorrow
              : t.freeTomorrow
            : notice.paid
              ? t.paidInDays
              : t.freeInDays,
        { n: notice.daysLeft },
      )
    : t.endedTitle;
  const body = fmt(
    ending ? (notice.paid ? t.paidBody : t.freeBody) : t.endedBody,
    { date },
  );
  const cta = ending ? (notice.paid ? t.renew : t.keep) : t.getBack;

  return (
    <section
      aria-labelledby="plan-banner-title"
      data-testid="plan-banner"
      className={`relative space-y-3 rounded-2xl border p-4 pr-12 ${
        ending
          ? 'border-amber-400/50 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-400/10'
          : 'border-border bg-surface'
      }`}
    >
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(key, '1');
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
        <h2 id="plan-banner-title" className="font-semibold">
          {title}
        </h2>
        <p className="text-sm text-muted">{body}</p>
      </div>
      <Link
        href="/account#plan-heading"
        className="btn-primary inline-flex rounded-xl px-4 py-2 text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {cta}
      </Link>
    </section>
  );
}
