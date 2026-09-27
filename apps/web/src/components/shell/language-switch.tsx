'use client';

import { useTransition } from 'react';

import { setLanguage } from '@/app/actions/language';
import { useLocale, useMessages } from '@/i18n/client';
import { LOCALE_NAMES, LOCALES } from '@/i18n/locales';

/**
 * English / Kiswahili. Saved on this device (cookie, so pages render in it
 * straight away) and on the account (morning reminders use it too).
 */
export function LanguageSwitch() {
  const locale = useLocale();
  const t = useMessages().shell;
  const [pending, start] = useTransition();
  return (
    <div
      role="radiogroup"
      aria-label={t.language}
      aria-busy={pending}
      className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface p-1"
    >
      {LOCALES.map((l) => {
        const on = l === locale;
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={on}
            lang={l}
            disabled={pending}
            onClick={() => start(() => setLanguage(l))}
            className={`flex h-10 items-center justify-center rounded-lg text-sm font-semibold focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-60 ${
              on
                ? 'border border-accent/40 bg-accent-soft text-foreground'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {LOCALE_NAMES[l]}
          </button>
        );
      })}
    </div>
  );
}
