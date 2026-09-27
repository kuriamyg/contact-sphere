import type { Metadata } from 'next';
import Link from 'next/link';

import { Avatar } from '@/components/avatar';
import { Notice } from '@/components/contacts/notice';
import { CheckIcon, ChevronRightIcon } from '@/components/icons';
import { plural } from '@/i18n/format';
import { getMessages, pageTitle } from '@/i18n/server';
import { type DuplicatePair, listDuplicates } from '@/lib/contacts';

export const generateMetadata = (): Promise<Metadata> =>
  pageTitle('duplicates');

function Person({ c }: { c: DuplicatePair['a'] }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar name={c.displayName} colourKey={c.id} />
      <span className="min-w-0">
        <span className="block truncate font-semibold">{c.displayName}</span>
        <span className="block truncate text-sm text-muted tabular-nums">
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
  const likely = pairs.filter((p) => p.confidence === 'high').length;
  return (
    <div className="max-w-xl space-y-6">
      <Link href="/contacts" className="text-sm text-muted hover:underline">
        {t.back}
      </Link>
      <header className="space-y-1">
        <p className="text-xs font-bold tracking-wider text-accent uppercase">
          {t.eyebrow}
        </p>
        <h1 className="text-[28px] leading-tight font-semibold">{t.title}</h1>
        <p className="text-muted">{t.lead}</p>
      </header>
      <Notice code={done} />

      {total === 0 ? (
        <div className="card flex flex-col items-center gap-2 rounded-3xl px-6 py-10 text-center">
          <span className="btn-primary inline-flex size-14 items-center justify-center rounded-full">
            <CheckIcon className="size-7" />
          </span>
          <h2 className="font-display text-xl font-semibold">{t.noneTitle}</h2>
          <p className="text-sm text-muted">{t.noneBody}</p>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2.5">
            <div className="card flex flex-col-reverse gap-0.5 rounded-2xl p-3">
              <dt className="text-xs text-muted">{t.statLikely}</dt>
              <dd className="font-display text-2xl font-semibold text-accent">
                {likely}
              </dd>
            </div>
            <div className="card flex flex-col-reverse gap-0.5 rounded-2xl p-3">
              <dt className="text-xs text-muted">{t.statPossible}</dt>
              <dd className="font-display text-2xl font-semibold">
                {pairs.length - likely}
              </dd>
            </div>
          </dl>
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
                  className="card block space-y-3 rounded-2xl p-4 hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                >
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                    <span
                      className={`rounded-full px-2.5 py-1 ${
                        p.confidence === 'high'
                          ? 'bg-accent-soft text-accent'
                          : 'bg-amber-400/15 text-amber-800 dark:text-amber-200'
                      }`}
                    >
                      {p.confidence === 'high' ? t.likely : t.possible}
                    </span>
                    {p.reasons.map((r) => (
                      <span
                        key={r}
                        className="rounded-full border border-border px-2.5 py-1 font-medium text-muted"
                      >
                        {t.reasons[r]}
                      </span>
                    ))}
                  </div>
                  <div className="relative space-y-2.5">
                    <span
                      aria-hidden="true"
                      className="absolute top-10 bottom-10 left-5 w-px bg-border"
                    />
                    <Person c={p.a} />
                    <Person c={p.b} />
                  </div>
                  <span className="flex items-center justify-between border-t border-border pt-3 text-sm font-semibold text-accent">
                    {t.review}
                    <ChevronRightIcon className="size-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
