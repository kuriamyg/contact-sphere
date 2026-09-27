'use client';

import { useState, useTransition } from 'react';

import { sendTestEmail, setEmailReminders } from '@/app/actions/reach';
import { useMessages } from '@/i18n/client';
import { fmt } from '@/i18n/format';

const button =
  'inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium bg-surface hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none disabled:opacity-60';

/** "Email me too": the morning reminder by email, counts only. */
export function EmailReminders({
  initialOn,
  email,
}: {
  initialOn: boolean;
  email: string;
}) {
  const t = useMessages().reminders;
  const [on, setOn] = useState(initialOn);
  const [note, setNote] = useState('');
  const [pending, start] = useTransition();

  const toggle = () =>
    start(async () => {
      setNote('');
      const next = !on;
      if (await setEmailReminders(next)) setOn(next);
      else setNote(t.emailSaveFailed);
    });
  const test = () =>
    start(async () => {
      setNote('');
      setNote((await sendTestEmail()) ? t.emailSent : t.emailFailed);
    });

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div className="flex items-center justify-between gap-3">
        <span id="email-reminders" className="text-sm font-medium">
          {t.emailTitle}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="email-reminders"
          disabled={pending}
          onClick={toggle}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60 ${
            on ? 'border-accent bg-accent' : 'border-border bg-surface-hover'
          }`}
        >
          <span
            aria-hidden="true"
            className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
              on ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      <p className="text-sm break-all text-muted">
        {fmt(t.emailTo, { email })}
      </p>
      {on && (
        <button
          type="button"
          onClick={test}
          disabled={pending}
          className={button}
        >
          {t.emailTest}
        </button>
      )}
      {note && (
        <p className="text-sm text-muted" role="status">
          {note}
        </p>
      )}
    </div>
  );
}
