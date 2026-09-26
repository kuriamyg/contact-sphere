import type { Metadata } from 'next';
import Link from 'next/link';

import { Avatar } from '@/components/avatar';
import { Notice } from '@/components/contacts/notice';
import { ChevronRightIcon } from '@/components/icons';
import { type DuplicatePair, listDuplicates } from '@/lib/contacts';

export const metadata: Metadata = {
  title: 'Clean up duplicates · Contact Sphere',
};

const REASON_TEXT: Record<DuplicatePair['reasons'][number], string> = {
  same_phone: 'Same phone number',
  same_email: 'Same email',
  same_name: 'Same name',
  similar_name: 'Same name, different order',
};

function Person({ c }: { c: DuplicatePair['a'] }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar name={c.displayName} colourKey={c.id} />
      <span className="min-w-0">
        <span className="block truncate font-medium">{c.displayName}</span>
        <span className="block truncate text-sm text-muted">
          {c.primaryPhone?.raw ?? c.primaryEmail ?? c.organization ?? ''}
        </span>
      </span>
    </span>
  );
}

export default async function DuplicatesPage({
  searchParams,
}: PageProps<'/contacts/duplicates'>) {
  const { done } = await searchParams;
  const { pairs, total } = await listDuplicates();
  return (
    <div className="space-y-6">
      <Link href="/contacts" className="text-sm text-muted hover:underline">
        ← Contacts
      </Link>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Clean up duplicates
        </h1>
        <p className="text-muted">
          Contacts that may be the same person, and why. Nothing is merged until
          you review a pair and confirm — and every merge can be undone for 30
          days.
        </p>
      </header>
      <Notice code={done} />

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <h2 className="text-lg font-semibold">No duplicates found</h2>
          <p className="mt-1 text-muted">
            Your contacts look clean. New imports are checked the same way.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted" aria-live="polite">
            {total} possible {total === 1 ? 'duplicate' : 'duplicates'}
            {total >= 200 ? ' shown (merge some to see more)' : ''}
          </p>
          <ul className="space-y-3">
            {pairs.map((p) => (
              <li key={`${p.a.id}-${p.b.id}`}>
                <Link
                  href={`/contacts/duplicates/review?keep=${p.a.id}&merge=${p.b.id}`}
                  prefetch={false}
                  className="block space-y-3 rounded-xl border border-border p-4 hover:bg-surface focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        p.confidence === 'high'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                          : 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100'
                      }`}
                    >
                      {p.confidence === 'high' ? 'Likely' : 'Possible'}
                    </span>
                    {p.reasons.map((r) => (
                      <span
                        key={r}
                        className="rounded-full border border-border px-2 py-0.5 text-muted"
                      >
                        {REASON_TEXT[r]}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                      <Person c={p.a} />
                      <Person c={p.b} />
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-accent">
                      Review
                      <ChevronRightIcon className="size-4" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
