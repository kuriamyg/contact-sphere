'use client';

import { useMessages } from '@/i18n/client';
import { SORT_OPTIONS, type SortValue } from '@/lib/contact-params';

/** Changing the order re-submits the search form straight away. */
export function SortSelect({ value }: { value: SortValue }) {
  const t = useMessages().sort;
  return (
    <div className="space-y-1.5">
      <label htmlFor="sort" className="block text-sm font-medium">
        {t.label}
      </label>
      <select
        id="sort"
        name="sort"
        defaultValue={value}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {t[o.value]}
          </option>
        ))}
      </select>
    </div>
  );
}
