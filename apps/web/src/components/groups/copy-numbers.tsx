'use client';

import { useState } from 'react';

/**
 * Copies every member's number, one per line: paste them into a new
 * WhatsApp group or broadcast list. (WhatsApp has no link that opens a chat
 * with many people.)
 */
export function CopyNumbers({ numbers }: { numbers: string[] }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(numbers.join('\n'));
          setState('copied');
        } catch {
          setState('failed');
        }
      }}
      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none"
    >
      <span aria-live="polite">
        {state === 'copied'
          ? `Copied ${numbers.length} ${numbers.length === 1 ? 'number' : 'numbers'}`
          : state === 'failed'
            ? 'Could not copy — try again'
            : 'Copy all numbers'}
      </span>
    </button>
  );
}
