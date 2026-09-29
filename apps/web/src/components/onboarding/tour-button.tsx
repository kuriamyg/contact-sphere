'use client';

import { SparkleIcon } from '@/components/icons';
import { useMessages } from '@/i18n/client';

import { startTour } from './tour-events';

/** Replays the first-run tour (Profile page). */
export function TourButton() {
  const t = useMessages().shell;
  return (
    <button
      type="button"
      onClick={startTour}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none"
    >
      <SparkleIcon className="size-4 text-accent" />
      {t.tour}
    </button>
  );
}
