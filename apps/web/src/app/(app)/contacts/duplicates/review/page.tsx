import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { dismissPair, mergePair } from '@/app/actions/merge';
import { Avatar } from '@/components/avatar';
import {
  type ContactDetail,
  type MergeField,
  mergePreview,
} from '@/lib/contacts';
import type { Messages } from '@/i18n/en';
import { fmt, plural } from '@/i18n/format';
import type { Locale } from '@/i18n/locales';
import { getLocale, getMessages, pageTitle } from '@/i18n/server';
import { formatBirthday } from '@/lib/format';

export const generateMetadata = (): Promise<Metadata> =>
  pageTitle('reviewDuplicate');

const show = (field: MergeField, v: string, locale: Locale) =>
  field === 'birthday' ? formatBirthday(v, locale) : v;

function Card({
  c,
  role,
  swapHref,
  t,
  locale,
}: {
  c: ContactDetail;
  role: 'keep' | 'merge';
  swapHref: string;
  t: Messages['duplicates'];
  locale: Locale;
}) {
  return (
    <section
      aria-label={role === 'keep' ? t.keepLabel : t.mergeLabel}
      className={`space-y-3 rounded-2xl border p-4 ${
        role === 'keep' ? 'border-accent bg-accent-soft' : 'border-border'
      }`}
    >
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">
        {role === 'keep' ? t.keep : t.mergeThenTrash}
      </p>
      <div className="flex items-center gap-3">
        <Avatar name={c.displayName} colourKey={c.id} size="md" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{c.displayName}</p>
          {c.organization && (
            <p className="truncate text-sm text-muted">{c.organization}</p>
          )}
        </div>
      </div>
      <ul className="space-y-1 text-sm">
        {c.phones.map((p, i) => (
          <li key={`p${i}`}>
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
      {role === 'merge' && (
        <Link
          href={swapHref}
          className="text-sm font-medium text-accent underline"
        >
          {t.keepInstead}
        </Link>
      )}
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

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/contacts/duplicates"
        className="text-sm text-muted hover:underline"
      >
        {t.allDuplicates}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{t.samePerson}</h1>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card
          c={p.keep}
          role="keep"
          swapHref={swapHref}
          t={t}
          locale={locale}
        />
        <Card
          c={p.merge}
          role="merge"
          swapHref={swapHref}
          t={t}
          locale={locale}
        />
      </div>

      <form action={mergePair} className="space-y-5">
        <input type="hidden" name="keepId" value={p.keep.id} />
        <input type="hidden" name="mergeId" value={p.merge.id} />

        {p.conflicts.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t.choose}</h2>
            {p.conflicts.map((c) => (
              <fieldset key={c.field} className="space-y-2 rounded-xl card p-4">
                <legend className="px-1 text-sm font-medium">
                  {t.fields[c.field]}
                </legend>
                {(['keep', 'merge'] as const).map((side) => (
                  <label key={side} className="flex items-center gap-3 py-1">
                    <input
                      type="radio"
                      name={`choice_${c.field}`}
                      value={side}
                      defaultChecked={side === 'keep'}
                      className="size-4 accent-[var(--accent)]"
                    />
                    <span className="break-words">
                      {show(c.field, c[side], locale)}
                    </span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        )}

        <div className="space-y-1 rounded-xl bg-surface p-4 text-sm">
          <p className="font-medium">{t.nothingLost}</p>
          <p className="text-muted">
            <strong className="text-foreground">{p.keep.displayName}</strong>{' '}
            {fmt(t.willHave, {
              numbers: plural(p.result.phones.length, t.numbers),
              emails: plural(p.result.emails.length, t.emails),
            })}{' '}
            <strong className="text-foreground">{p.merge.displayName}</strong>{' '}
            {t.movesToTrash}
          </p>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg btn-primary px-4 py-3 font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {fmt(t.mergeInto, { name: p.keep.displayName })}
        </button>
      </form>

      <form action={dismissPair}>
        <input type="hidden" name="keepId" value={p.keep.id} />
        <input type="hidden" name="mergeId" value={p.merge.id} />
        <button
          type="submit"
          className="w-full rounded-lg border border-border px-4 py-3 font-medium bg-surface hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none"
        >
          {t.notSame}
        </button>
      </form>
    </div>
  );
}
