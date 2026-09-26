'use client';

import { SORT_OPTIONS, type SortValue } from '@/lib/contact-params';

/** Changing the order re-submits the search form straight away. */
export function SortSelect({ value }: { value: SortValue }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="sort" className="block text-sm font-medium">
        Sort by
      </label>
      <select
        id="sort"
        name="sort"
        defaultValue={value}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
