import type { Metadata } from 'next';
import Link from 'next/link';

import { emptyTrash } from '@/app/actions/contacts';
import { Notice } from '@/components/contacts/notice';
import { SortSelect } from '@/components/contacts/sort-select';
import {
  listHref,
  PAGE_SIZE,
  parseListParams,
  type View,
} from '@/lib/contact-params';
import { listContacts } from '@/lib/contacts';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Contacts · Contact Sphere' };

const VIEWS: { view: View; label: string }[] = [
  { view: 'active', label: 'Contacts' },
  { view: 'archived', label: 'Archived' },
  { view: 'trash', label: 'Trash' },
];

const primaryButton =
  'rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90 focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2 focus-visible:outline-none';
const secondaryButton =
  'rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none';

export default async function ContactsPage({
  searchParams,
}: PageProps<'/contacts'>) {
  const sp = await searchParams;
  const p = parseListParams(sp);
  const { items, total, page } = await listContacts(p);
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
        <Link href="/contacts/new" className={primaryButton}>
          New contact
        </Link>
      </header>

      <Notice code={sp.done} />

      <nav
        aria-label="Contact lists"
        className="flex gap-1 border-b border-border"
      >
        {VIEWS.map(({ view, label }) => {
          const current = p.view === view;
          return (
            <Link
              key={view}
              href={listHref(p, { view, page: 1 })}
              aria-current={current ? 'page' : undefined}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                current
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <form
        role="search"
        action="/contacts"
        className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end"
      >
        {p.view !== 'active' && (
          <input type="hidden" name="view" value={p.view} />
        )}
        <div className="space-y-1.5">
          <label htmlFor="q" className="block text-sm font-medium">
            Search
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={p.q}
            maxLength={100}
            placeholder="Name, number, email or organisation"
            className="block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          />
        </div>
        <SortSelect value={p.sort} />
        <button type="submit" className={secondaryButton}>
          Search
        </button>
      </form>

      {p.view === 'trash' && (
        <p className="text-sm text-muted">
          Contacts in the trash are deleted for good 30 days after they were
          moved there.
        </p>
      )}

      {items.length === 0 ? (
        <EmptyState view={p.view} q={p.q} />
      ) : (
        <>
          <p className="text-sm text-muted" aria-live="polite">
            {from === 1 && to === total
              ? `${total} ${total === 1 ? 'contact' : 'contacts'}`
              : `${from}–${to} of ${total}`}
            {p.q ? ` matching “${p.q}”` : ''}
          </p>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {items.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/contacts/${c.id}`}
                  prefetch={false}
                  className="flex flex-col gap-0.5 px-4 py-3 hover:bg-surface focus-visible:bg-surface focus-visible:outline-none sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {c.displayName}
                    </span>
                    {c.organization && (
                      <span className="block truncate text-sm text-muted">
                        {c.organization}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm text-muted">
                    {p.view === 'trash' && c.deletedAt
                      ? `Deleted ${formatDate(c.deletedAt)}`
                      : (c.primaryPhone?.raw ?? c.primaryEmail ?? '')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {lastPage > 1 && (
            <nav
              aria-label="Pages"
              className="flex items-center justify-between gap-3"
            >
              {page > 1 ? (
                <Link
                  href={listHref(p, { page: page - 1 })}
                  className={secondaryButton}
                >
                  Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-sm text-muted">
                Page {page} of {lastPage}
              </span>
              {page < lastPage ? (
                <Link
                  href={listHref(p, { page: page + 1 })}
                  className={secondaryButton}
                >
                  Next
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}

      {p.view === 'trash' && total > 0 && (
        <details className="rounded-xl border border-red-300 p-4 dark:border-red-900">
          <summary className="cursor-pointer text-sm font-medium text-red-700 dark:text-red-300">
            Empty the trash
          </summary>
          <form action={emptyTrash} className="mt-3 space-y-3">
            <p className="text-sm">
              This deletes all {total} {total === 1 ? 'contact' : 'contacts'} in
              the trash for good, with their numbers and emails. It cannot be
              undone.
            </p>
            <button
              type="submit"
              className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-800 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
            >
              Delete {total} for good
            </button>
          </form>
        </details>
      )}
    </div>
  );
}

function EmptyState({ view, q }: { view: View; q: string }) {
  let title: string;
  let body: string;
  if (q) {
    title = `No contacts match “${q}”`;
    body = 'Try part of a name, a few digits of the number, or an email.';
  } else if (view === 'archived') {
    title = 'Nothing archived';
    body = 'Archive contacts you want to keep but not see every day.';
  } else if (view === 'trash') {
    title = 'The trash is empty';
    body = 'Deleted contacts stay here for 30 days before they are removed.';
  } else {
    title = 'No contacts yet';
    body = 'Add your first contact to get started.';
  }
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-muted">{body}</p>
      {!q && view === 'active' && (
        <Link
          href="/contacts/new"
          className={`mt-4 inline-block ${primaryButton}`}
        >
          New contact
        </Link>
      )}
    </div>
  );
}
