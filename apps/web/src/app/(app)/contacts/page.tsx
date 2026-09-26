import type { Metadata } from 'next';
import Link from 'next/link';

import { emptyTrash } from '@/app/actions/contacts';
import { Avatar } from '@/components/avatar';
import { ChevronRightIcon } from '@/components/icons';
import { Notice } from '@/components/contacts/notice';
import { SortSelect } from '@/components/contacts/sort-select';
import {
  listHref,
  PAGE_SIZE,
  parseListParams,
  type View,
} from '@/lib/contact-params';
import { indexLetter } from '@/lib/avatar';
import { type ContactSummary, listContacts, listTags } from '@/lib/contacts';
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
  const [{ items, total, page }, tags] = await Promise.all([
    listContacts(p),
    p.view === 'active' ? listTags() : Promise.resolve([]),
  ]);
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/contacts/duplicates" className={secondaryButton}>
            Clean up
          </Link>
          <Link href="/contacts/import" className={secondaryButton}>
            Import
          </Link>
          {/* A file download from a route handler, not a page: a plain link
              (Link would try client-side navigation). */}
          <a href="/contacts/export" download className={secondaryButton}>
            Export
          </a>
          <Link href="/contacts/new" className={primaryButton}>
            New contact
          </Link>
        </div>
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
        {p.tag && <input type="hidden" name="tag" value={p.tag} />}
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
            placeholder="Name, skill, area, number…"
            className="block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          />
        </div>
        <SortSelect value={p.sort} />
        <button type="submit" className={secondaryButton}>
          Search
        </button>
      </form>

      {(tags.length > 0 || p.tag) && (
        <nav
          aria-label="Skills and services"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {p.tag && (
            <Link
              href={listHref(p, { tag: '', page: 1 })}
              aria-label={`Stop filtering by ${p.tag}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-background"
            >
              {p.tag}
              <span aria-hidden="true">×</span>
            </Link>
          )}
          {tags
            .filter((t) => t.tag !== p.tag)
            .slice(0, 15)
            .map((t) => (
              <Link
                key={t.tag}
                href={listHref(p, { tag: t.tag, page: 1 })}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm hover:bg-surface focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none"
              >
                {t.tag}
                <span className="text-xs text-muted tabular-nums">
                  {t.count}
                </span>
              </Link>
            ))}
        </nav>
      )}

      {p.view === 'trash' && (
        <p className="text-sm text-muted">
          Contacts in the trash are deleted for good 30 days after they were
          moved there.
        </p>
      )}

      {items.length === 0 ? (
        <EmptyState view={p.view} q={p.q} tag={p.tag} />
      ) : (
        <>
          <p className="text-sm text-muted" aria-live="polite">
            {from === 1 && to === total
              ? `${total} ${total === 1 ? 'contact' : 'contacts'}`
              : `${from}–${to} of ${total}`}
            {p.q ? ` matching “${p.q}”` : ''}
            {p.tag ? ` tagged “${p.tag}”` : ''}
          </p>
          <div className="space-y-4">
            {groupByLetter(
              items,
              p.sort.startsWith('name') && !p.q && !p.tag,
            ).map(({ letter, rows }) => (
              <section key={letter ?? 'all'} aria-label={letter ?? undefined}>
                {letter && (
                  <h2 className="mb-1 px-1 text-sm font-semibold text-accent">
                    {letter}
                  </h2>
                )}
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                  {rows.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/contacts/${c.id}`}
                        prefetch={false}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface focus-visible:bg-surface focus-visible:outline-none sm:px-4"
                      >
                        <Avatar name={c.displayName} colourKey={c.id} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {c.displayName}
                          </span>
                          <span className="block truncate text-sm text-muted">
                            {p.view === 'trash' && c.deletedAt
                              ? `Deleted ${formatDate(c.deletedAt)}`
                              : [
                                  c.primaryPhone?.raw ?? c.primaryEmail,
                                  c.organization,
                                  (c.tags ?? []).slice(0, 2).join(', '),
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                          </span>
                        </span>
                        <ChevronRightIcon className="size-4 shrink-0 text-muted" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
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

function EmptyState({ view, q, tag }: { view: View; q: string; tag: string }) {
  let title: string;
  let body: string;
  if (tag && !q) {
    title = `No contacts tagged “${tag}”`;
    body = 'Add skills and services when you edit a contact.';
  } else if (q) {
    title = `No contacts match “${q}”`;
    body =
      'Try part of a name, a skill, an area, a few digits of the number, or an email.';
  } else if (view === 'archived') {
    title = 'Nothing archived';
    body = 'Archive contacts you want to keep but not see every day.';
  } else if (view === 'trash') {
    title = 'The trash is empty';
    body = 'Deleted contacts stay here for 30 days before they are removed.';
  } else {
    title = 'No contacts yet';
    body = 'Import the contacts from your phone, or add one by hand.';
  }
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-muted">{body}</p>
      {!q && !tag && view === 'active' && (
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link href="/contacts/import" className={primaryButton}>
            Import from a .vcf file
          </Link>
          <Link href="/contacts/new" className={secondaryButton}>
            New contact
          </Link>
        </div>
      )}
    </div>
  );
}

/** A–Z sections when sorted by name; one untitled section otherwise. */
function groupByLetter(
  items: ContactSummary[],
  byLetter: boolean,
): { letter: string | null; rows: ContactSummary[] }[] {
  if (!byLetter) return [{ letter: null, rows: items }];
  const groups: { letter: string; rows: ContactSummary[] }[] = [];
  for (const c of items) {
    const letter = indexLetter(c.displayName);
    const last = groups[groups.length - 1];
    if (last?.letter === letter) last.rows.push(c);
    else groups.push({ letter, rows: [c] });
  }
  return groups;
}
