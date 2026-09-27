import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { dismissPair, mergePair } from '@/app/actions/merge';
import { Avatar } from '@/components/avatar';
import { ArrowDownIcon, CheckIcon, SwapIcon } from '@/components/icons';
import type { Messages } from '@/i18n/en';
import { fmt, plural } from '@/i18n/format';
import type { Locale } from '@/i18n/locales';
import { getLocale, getMessages, pageTitle } from '@/i18n/server';
import {
  type ContactDetail,
  type MergeField,
  mergePreview,
} from '@/lib/contacts';
import { formatBirthday } from '@/lib/format';

export const generateMetadata = (): Promise<Metadata> =>
  pageTitle('reviewDuplicate');

const show = (field: MergeField, v: string, locale: Locale) =>
  field === 'birthday' ? formatBirthday(v, locale) : v;

function Card({
  c,
  role,
  t,
  locale,
}: {
  c: ContactDetail;
  role: 'keep' | 'merge';
  t: Messages['duplicates'];
  locale: Locale;
}) {
  const keep = role === 'keep';
  return (
    <section
      aria-label={keep ? t.keepLabel : t.mergeLabel}
      className={`space-y-3 rounded-2xl p-4 ${
        keep
          ? 'border border-accent/50 bg-gradient-to-br from-emerald-500/15 to-violet-500/10 shadow-[var(--card-shadow)]'
          : 'card opacity-90'
      }`}
    >
      <div className="flex items-center gap-3">
        <Avatar name={c.displayName} colourKey={c.id} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{c.displayName}</p>
          {c.organization && (
            <p className="truncate text-sm text-muted">{c.organization}</p>
          )}
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            keep
              ? 'bg-accent-soft text-accent'
              : 'border border-border text-muted'
          }`}
        >
          {keep && <CheckIcon className="size-3.5" />}
          {keep ? t.stays : t.mergedIn}
        </span>
      </div>
      <p className="sr-only">{keep ? t.keep : t.mergeThenTrash}</p>
      <ul className="space-y-1 text-sm">
        {c.phones.map((p, i) => (
          <li key={`p${i}`} className="tabular-nums">
            {p.raw}
            {p.label && <span className="text-muted"> · {p.label}</span>}
          </li>
        ))}
        {c.emails.map((e, i) => (
          <li key={`e${i}`} className="break-all">
            {e.address}
          </li>
        ))}
        {c.birthday && (
          <li>
            {fmt(t.birthday, { date: formatBirthday(c.birthday, locale) })}
          </li>
        )}
        {c.notes && (
          <li className="line-clamp-3 whitespace-pre-wrap text-muted">
            {c.notes}
          </li>
        )}
      </ul>
    </section>
  );
}

export default async function ReviewPage({
  searchParams,
}: PageProps<'/contacts/duplicates/review'>) {
  const sp = await searchParams;
  const keepId = typeof sp.keep === 'string' ? sp.keep : '';
  const mergeId = typeof sp.merge === 'string' ? sp.merge : '';
  const p = await mergePreview(keepId, mergeId);
  if (!p) notFound();
  const swapHref = `/contacts/duplicates/review?keep=${mergeId}&merge=${keepId}`;
  const [m, locale] = await Promise.all([getMessages(), getLocale()]);
  const t = m.duplicates;
  const names = { keep: p.keep.displayName, merge: p.merge.displayName };

  return (
    <div className="max-w-xl space-y-6">
      <Link
        href="/contacts/duplicates"
        className="text-sm text-muted hover:underline"
      >
        {t.allDuplicates}
      </Link>
      <header className="space-y-1">
        <p className="text-xs font-bold tracking-wider text-accent uppercase">
          {t.reviewEyebrow}
        </p>
        <h1 className="text-[28px] leading-tight font-semibold">
          {t.samePerson}
        </h1>
      </header>

      <div className="space-y-2">
        <Card c={p.merge} role="merge" t={t} locale={locale} />
        <div className="flex items-center justify-between gap-3 px-2">
          <span
            aria-hidden="true"
            className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface text-accent"
          >
            <ArrowDownIcon className="size-4" />
          </span>
          <Link
            href={swapHref}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-sm font-semibold hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <SwapIcon className="size-4" />
            {t.keepInstead}
          </Link>
        </div>
        <Card c={p.keep} role="keep" t={t} locale={locale} />
      </div>

      <form action={mergePair} className="space-y-6">
        <input type="hidden" name="keepId" value={p.keep.id} />
        <input type="hidden" name="mergeId" value={p.merge.id} />

        {p.conflicts.length > 0 && (
          <section aria-labelledby="choose" className="space-y-3">
            <div className="space-y-0.5">
              <h2
                id="choose"
                className="text-xs font-bold tracking-wider text-muted uppercase"
              >
                {t.choose}
              </h2>
              <p className="text-sm text-muted">{t.choosePick}</p>
            </div>
            {p.conflicts.map((c) => (
              <fieldset key={c.field} className="space-y-2">
                <legend className="mb-2 text-sm font-semibold">
                  {t.fields[c.field]}
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(['keep', 'merge'] as const).map((side) => (
                    <label
                      key={side}
                      className="card flex cursor-pointer items-start gap-3 rounded-2xl p-3 has-checked:border-accent has-checked:bg-accent-soft has-focus-visible:ring-2 has-focus-visible:ring-accent"
                    >
                      <input
                        type="radio"
                        name={`choice_${c.field}`}
                        value={side}
                        defaultChecked={side === 'keep'}
                        className="mt-1 size-4 accent-[var(--accent)]"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium break-words">
                          {show(c.field, c[side], locale)}
                        </span>
                        <span className="block text-xs text-muted">
                          {side === 'keep' ? t.fromKeep : t.fromMerge}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </section>
        )}

        <section
          aria-labelledby="after"
          className="card space-y-3 rounded-2xl p-4"
        >
          <h2
            id="after"
            className="text-xs font-bold tracking-wider text-muted uppercase"
          >
            {t.afterTitle}
          </h2>
          <div className="flex items-center gap-3">
            <Avatar name={names.keep} colourKey={p.keep.id} ring />
            <div className="min-w-0">
              <p className="truncate font-semibold">{names.keep}</p>
              <div className="mt-1 flex flex-wrap gap-1.5 text-xs font-medium">
                {[
                  plural(p.result.phones.length, t.numbers),
                  plural(p.result.emails.length, t.emails),
                  t.notesBoth,
                ].map((x) => (
                  <span
                    key={x}
                    className="rounded-full bg-accent-soft px-2.5 py-0.5 text-accent"
                  >
                    {x}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p className="text-sm text-muted">
            <strong className="font-semibold text-foreground">
              {t.nothingLost}.
            </strong>{' '}
            <strong className="text-foreground">{names.keep}</strong>{' '}
            {fmt(t.willHave, {
              numbers: plural(p.result.phones.length, t.numbers),
              emails: plural(p.result.emails.length, t.emails),
            })}{' '}
            <strong className="text-foreground">{names.merge}</strong>{' '}
            {t.movesToTrash}
          </p>
        </section>

        <button
          type="submit"
          className="btn-primary inline-flex h-12 w-full items-center justify-center rounded-xl px-5 text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {fmt(t.mergeInto, { name: names.keep })}
        </button>
      </form>

      <form action={dismissPair}>
        <input type="hidden" name="keepId" value={p.keep.id} />
        <input type="hidden" name="mergeId" value={p.merge.id} />
        <button
          type="submit"
          className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-surface px-5 text-sm font-semibold hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          {t.notSame}
        </button>
      </form>
    </div>
  );
}
