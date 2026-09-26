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
import { formatBirthday } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Review duplicate · Contact Sphere',
};

const FIELD_LABEL: Record<MergeField, string> = {
  displayName: 'Name shown in lists',
  givenName: 'First name',
  familyName: 'Last name',
  nickname: 'Nickname',
  organization: 'Organisation',
  jobTitle: 'Job title',
  birthday: 'Birthday',
};

const show = (field: MergeField, v: string) =>
  field === 'birthday' ? formatBirthday(v) : v;

function Card({
  c,
  role,
  swapHref,
}: {
  c: ContactDetail;
  role: 'keep' | 'merge';
  swapHref: string;
}) {
  return (
    <section
      aria-label={role === 'keep' ? 'Contact to keep' : 'Contact to merge in'}
      className={`space-y-3 rounded-2xl border p-4 ${
        role === 'keep' ? 'border-accent bg-accent-soft' : 'border-border'
      }`}
    >
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">
        {role === 'keep' ? 'Keep' : 'Merge into it, then trash'}
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
        {c.birthday && <li>Birthday {formatBirthday(c.birthday)}</li>}
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
          Keep this one instead
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

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/contacts/duplicates"
        className="text-sm text-muted hover:underline"
      >
        ← All duplicates
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Same person?</h1>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card c={p.keep} role="keep" swapHref={swapHref} />
        <Card c={p.merge} role="merge" swapHref={swapHref} />
      </div>

      <form action={mergePair} className="space-y-5">
        <input type="hidden" name="keepId" value={p.keep.id} />
        <input type="hidden" name="mergeId" value={p.merge.id} />

        {p.conflicts.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Choose what to keep</h2>
            {p.conflicts.map((c) => (
              <fieldset
                key={c.field}
                className="space-y-2 rounded-xl border border-border p-4"
              >
                <legend className="px-1 text-sm font-medium">
                  {FIELD_LABEL[c.field]}
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
                      {show(c.field, c[side])}
                    </span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        )}

        <div className="space-y-1 rounded-xl bg-surface p-4 text-sm">
          <p className="font-medium">Nothing is lost</p>
          <p className="text-muted">
            <strong className="text-foreground">{p.keep.displayName}</strong>{' '}
            will have {p.result.phones.length}{' '}
            {p.result.phones.length === 1 ? 'number' : 'numbers'} and{' '}
            {p.result.emails.length}{' '}
            {p.result.emails.length === 1 ? 'email' : 'emails'} (everything from
            both, repeats removed), notes from both, and any details only the
            other one has.{' '}
            <strong className="text-foreground">{p.merge.displayName}</strong>{' '}
            moves to the trash. You can undo this for 30 days from the kept
            contact’s page.
          </p>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-foreground px-4 py-3 font-medium text-background hover:opacity-90 focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Merge into {p.keep.displayName}
        </button>
      </form>

      <form action={dismissPair}>
        <input type="hidden" name="keepId" value={p.keep.id} />
        <input type="hidden" name="mergeId" value={p.merge.id} />
        <button
          type="submit"
          className="w-full rounded-lg border border-border px-4 py-3 font-medium hover:bg-surface focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none"
        >
          Not the same person
        </button>
      </form>
    </div>
  );
}
