'use client';

import { useMessages } from '@/i18n/client';

/**
 * The screen-reader "loading" line. A client component so the loading
 * screens stay static (they are prefetch boundaries) yet speak the
 * reader's language.
 */
export function LoadingStatus({
  what,
}: {
  what: 'loadingContacts' | 'loadingContact';
}) {
  return (
    <p className="sr-only" role="status">
      {useMessages().shell[what]}
    </p>
  );
}
