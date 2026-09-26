import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  archiveContact,
  deleteContactForGood,
  restoreContact,
  trashContact,
  unarchiveContact,
} from '@/app/actions/contacts';
import { Notice } from '@/components/contacts/notice';
import { getContact, markUsed, type Phone } from '@/lib/contacts';
import {
  formatBirthday,
  formatDate,
  formatDateTime,
  whatsappHref,
} from '@/lib/format';

export const metadata: Metadata = { title: 'Contact · Contact Sphere' };

const action =
  'inline-flex items-center rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none';
const button =
  'rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none';

export default async function ContactPage({
  params,
  searchParams,
}: PageProps<'/contacts/[id]'>) {
  const { id } = await params;
  const { done } = await searchParams;
  const c = await getContact(id);
  if (!c) notFound();
  // Opening a contact is what "last used" means (ADR 0007).
  if (!c.deletedAt) await markUsed(c.id).catch(() => undefined);

  const subtitle = [c.jobTitle, c.organization].filter(Boolean).join(' · ');

  return (
    <article className="max-w-xl space-y-8">
      <Link href="/contacts" className="text-sm text-muted hover:underline">
        ← Contacts
      </Link>

      <Notice code={done} />

      {c.deletedAt && c.purgeAt && (
        <div
          role="status"
          className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
        >
          <p>
            In the trash. It will be deleted for good on{' '}
            <strong>{formatDate(c.purgeAt)}</strong>.
          </p>
          <div className="flex flex-wrap gap-3">
            <form action={restoreContact}>
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" className={button}>
                Restore
              </button>
            </form>
            <details>
              <summary className={`${button} cursor-pointer list-none`}>
                Delete for good
              </summary>
              <form action={deleteContactForGood} className="mt-3 space-y-2">
                <input type="hidden" name="id" value={c.id} />
                <p className="text-sm">
                  This removes the contact, its numbers and emails. It cannot be
                  undone.
                </p>
                <button
                  type="submit"
                  className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-800 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
                >
                  Delete for good
                </button>
              </form>
            </details>
          </div>
        </div>
      )}

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight break-words">
          {c.displayName}
        </h1>
        {c.nickname && <p className="text-muted">“{c.nickname}”</p>}
        {subtitle && <p className="text-muted">{subtitle}</p>}
        {c.archivedAt && !c.deletedAt && (
          <p className="text-sm text-muted">Archived</p>
        )}
      </header>

      {c.phones.length > 0 && (
        <section aria-labelledby="phones" className="space-y-3">
          <h2
            id="phones"
            className="text-sm font-semibold text-muted uppercase"
          >
            Phone
          </h2>
          <ul className="space-y-4">
            {c.phones.map((p, i) => (
              <PhoneRow key={i} phone={p} primary={i === 0} />
            ))}
          </ul>
        </section>
      )}

      {c.emails.length > 0 && (
        <section aria-labelledby="emails" className="space-y-3">
          <h2
            id="emails"
            className="text-sm font-semibold text-muted uppercase"
          >
            Email
          </h2>
          <ul className="space-y-3">
            {c.emails.map((e, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span className="min-w-0 break-all">
                  {e.address}
                  {e.label && (
                    <span className="ml-2 text-sm text-muted">{e.label}</span>
                  )}
                </span>
                <a href={`mailto:${e.address}`} className={action}>
                  Email
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(c.birthday || c.notes) && (
        <section aria-labelledby="details" className="space-y-3">
          <h2
            id="details"
            className="text-sm font-semibold text-muted uppercase"
          >
            Details
          </h2>
          <dl className="space-y-3">
            {c.birthday && (
              <div>
                <dt className="text-sm text-muted">Birthday</dt>
                <dd>{formatBirthday(c.birthday)}</dd>
              </div>
            )}
            {c.notes && (
              <div>
                <dt className="text-sm text-muted">Notes</dt>
                <dd className="whitespace-pre-wrap break-words">{c.notes}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <p className="text-sm text-muted">
        Saved {formatDate(c.createdAt)} · Edited {formatDateTime(c.updatedAt)}
      </p>

      {!c.deletedAt && (
        <div className="flex flex-wrap gap-3 border-t border-border pt-6">
          <Link href={`/contacts/${c.id}/edit`} className={button}>
            Edit
          </Link>
          <form action={c.archivedAt ? unarchiveContact : archiveContact}>
            <input type="hidden" name="id" value={c.id} />
            <button type="submit" className={button}>
              {c.archivedAt ? 'Unarchive' : 'Archive'}
            </button>
          </form>
          <form action={trashContact}>
            <input type="hidden" name="id" value={c.id} />
            <button
              type="submit"
              className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
            >
              Move to trash
            </button>
          </form>
        </div>
      )}
    </article>
  );
}

/** A number with one-tap actions. WhatsApp needs a parsed (E.164) number. */
function PhoneRow({ phone, primary }: { phone: Phone; primary: boolean }) {
  const dial = phone.e164 ?? phone.raw;
  return (
    <li className="space-y-2">
      <p>
        <span className="text-lg">{phone.raw}</span>
        {(phone.label || primary) && (
          <span className="ml-2 text-sm text-muted">
            {[phone.label, primary ? 'primary' : null]
              .filter(Boolean)
              .join(' · ')}
          </span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <a href={`tel:${dial}`} className={action}>
          Call
        </a>
        <a href={`sms:${dial}`} className={action}>
          SMS
        </a>
        {phone.e164 && (
          <a
            href={whatsappHref(phone.e164)}
            target="_blank"
            rel="noopener noreferrer"
            className={action}
          >
            WhatsApp
          </a>
        )}
      </div>
    </li>
  );
}
