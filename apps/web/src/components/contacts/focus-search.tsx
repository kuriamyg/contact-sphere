'use client';

import { useEffect } from 'react';

/**
 * Puts the cursor in the search box when the page was opened from the
 * bottom bar's Search. After the router settles, so its own focus
 * handling does not take it back.
 */
export function FocusSearch({ when }: { when: boolean }) {
  useEffect(() => {
    if (!when) return;
    const id = window.setTimeout(() => {
      document.getElementById('q')?.focus();
    }, 50);
    return () => window.clearTimeout(id);
  }, [when]);
  return null;
}
