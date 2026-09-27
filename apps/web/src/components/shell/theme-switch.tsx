'use client';

import { useState } from 'react';

import { useMessages } from '@/i18n/client';
import { applyTheme, type Theme, THEMES } from '@/lib/theme';

function Icon({ theme }: { theme: Theme }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    'aria-hidden': true,
  } as const;
  if (theme === 'light') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
      </svg>
    );
  }
  if (theme === 'dark') {
    return (
      <svg {...common}>
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

/**
 * Auto (follow the phone) / Light / Dark. Applies at once and is remembered
 * on this device (cookie read by the server, so there is no flash).
 */
export function ThemeSwitch({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);
  const t = useMessages().shell;

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div
      role="radiogroup"
      aria-label={t.appearance}
      className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-surface p-1"
    >
      {THEMES.map((th) => {
        const on = th === theme;
        return (
          <button
            key={th}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => choose(th)}
            className={`flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
              on
                ? 'border border-accent/40 bg-accent-soft text-foreground'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <Icon theme={th} />
            {t[th]}
          </button>
        );
      })}
    </div>
  );
}
