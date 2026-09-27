import type { Metadata } from 'next';
import Link from 'next/link';

import { Avatar } from '@/components/avatar';
import { Notice } from '@/components/contacts/notice';
import { ChevronRightIcon } from '@/components/icons';
import { plural } from '@/i18n/format';
import { getMessages, pageTitle } from '@/i18n/server';
import { type DuplicatePair, listDuplicates } from '@/lib/contacts';

export const generateMetadata = (): Promise<Metadata> =>
  pageTitle('duplicates');

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
  const [{ pairs, total }, m] = await Promise.all([
    listDuplicates(),
    getMessages(),
  ]);
  const t = m.duplicates;
  return (
    <div className="space-y-6">
      <Link href="/contacts" className="text-sm text-muted hover:underline">
        {t.back}
      </Link>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-muted">{t.lead}</p>
      </header>
      <Notice code={done} />

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <h2 className="text-lg font-semibold">{t.noneTitle}</h2>
          <p className="mt-1 text-muted">{t.noneBody}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted" aria-live="polite">
            {plural(total, t.count)}
            {total >= 200 ? t.capped : ''}
          </p>
          <ul className="space-y-3">
            {pairs.map((p) => (
              <li key={`${p.a.id}-${p.b.id}`}>
                <Link
                  href={`/contacts/duplicates/review?keep=${p.a.id}&merge=${p.b.id}`}
                  prefetch={false}
                  className="block space-y-3 rounded-xl border border-border p-4 bg-surface hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        p.confidence === 'high'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                          : 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100'
                      }`}
                    >
                      {p.confidence === 'high' ? t.likely : t.possible}
                    </span>
                    {p.reasons.map((r) => (
                      <span
                        key={r}
                        className="rounded-full border border-border px-2 py-0.5 text-muted"
                      >
                        {t.reasons[r]}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                      <Person c={p.a} />
                      <Person c={p.b} />
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-accent">
                      {t.review}
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
