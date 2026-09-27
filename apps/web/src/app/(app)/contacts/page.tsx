import type { Metadata } from 'next';
import Link from 'next/link';

import { emptyTrash } from '@/app/actions/contacts';
import { saveSearch } from '@/app/actions/tags';
import { Avatar } from '@/components/avatar';
import { ChevronRightIcon } from '@/components/icons';
import { Notice } from '@/components/contacts/notice';
import { FocusSearch } from '@/components/contacts/focus-search';
import { SortSelect } from '@/components/contacts/sort-select';
import {
  detailHref,
  listHref,
  PAGE_SIZE,
  parseListParams,
  type View,
} from '@/lib/contact-params';
import { indexLetter } from '@/lib/avatar';
import {
  type ContactSummary,
  listContacts,
  listSavedSearches,
  listTags,
} from '@/lib/contacts';
import type { Messages } from '@/i18n/en';
import { fmt, plural } from '@/i18n/format';
import { getLocale, getMessages, pageTitle } from '@/i18n/server';
import { formatDate } from '@/lib/format';
import { isWide } from '@/lib/wide';

export const generateMetadata = (): Promise<Metadata> => pageTitle('contacts');

const VIEWS: View[] = ['active', 'archived', 'trash'];

const primaryButton =
  'rounded-lg btn-primary px-4 py-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none';
const secondaryButton =
  'rounded-lg border border-border px-4 py-2.5 text-sm font-medium bg-surface hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none';

export default async function ContactsPage({
  searchParams,
}: PageProps<'/contacts'>) {
  const sp = await searchParams;
  const p = parseListParams(sp);
  const wide = await isWide();
  const active = p.view === 'active';
  const [{ items, total, page }, tags, searches, m, locale] = await Promise.all(
    [
      listContacts(p),
      active ? listTags() : Promise.resolve([]),
      active ? listSavedSearches() : Promise.resolve([]),
      getMessages(),
      getLocale(),
    ],
  );
  const t = m.contacts.list;
  const chip =
    'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm bg-surface hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none';
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const headerEl = (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/contacts/duplicates" className={secondaryButton}>
            {t.cleanUp}
          </Link>
          <Link href="/contacts/import" className={secondaryButton}>
            {t.import}
          </Link>
          {/* A file download from a route handler, not a page: a plain link
              (Link would try client-side navigation). */}
          <a href="/contacts/export" download className={secondaryButton}>
            {t.export}
          </a>
          <Link href="/contacts/new" className={primaryButton}>
            {t.newContact}
          </Link>
        </div>
      </header>
    </>
  );
  const noticeEl = (
    <>
      <Notice code={sp.done} />
      <FocusSearch when={sp.find === '1'} />
    </>
  );
  const chipsEl = (
    <>
      {searches.length > 0 && (
        <nav
          aria-label={t.savedNav}
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {searches.map((s) => (
            <Link
              key={s.id}
              href={listHref(p, { q: s.query, tag: s.tag ?? '', page: 1 })}
              aria-current={
                s.query === p.q && (s.tag ?? '') === p.tag ? 'true' : undefined
              }
              className={`${chip} font-medium aria-[current]:border-accent aria-[current]:text-accent`}
            >
              <span aria-hidden="true">★</span>
              {s.name}
            </Link>
          ))}
        </nav>
      )}

      {(tags.length > 0 || p.tag) && (
        <nav
          aria-label={t.skillsNav}
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {p.tag && (
            <Link
              href={listHref(p, { tag: '', page: 1 })}
              aria-label={fmt(t.stopFilter, { tag: p.tag })}
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
                className={chip}
              >
                {t.tag}
                <span className="text-xs text-muted tabular-nums">
                  {t.count}
                </span>
              </Link>
            ))}
          {active && tags.length > 0 && (
            <Link
              href="/contacts/tags"
              className="inline-flex shrink-0 items-center px-2 py-1.5 text-sm font-medium text-accent underline"
            >
              {t.manage}
            </Link>
          )}
        </nav>
      )}

      {active &&
        (p.q || p.tag) &&
        !searches.some((s) => s.query === p.q && (s.tag ?? '') === p.tag) && (
          <details className="rounded-xl card px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">
              {t.saveThis}
            </summary>
            <form action={saveSearch} className="mt-3 flex gap-2">
              <input type="hidden" name="q" value={p.q} />
              <input type="hidden" name="tag" value={p.tag} />
              <label htmlFor="saved-name" className="sr-only">
                {t.nameForSearch}
              </label>
              <input
                id="saved-name"
                name="name"
                required
                maxLength={60}
                defaultValue={[p.tag, p.q].filter(Boolean).join(' · ')}
                className="block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
              />
              <button type="submit" className={secondaryButton}>
                {t.save}
              </button>
            </form>
          </details>
        )}

      {p.view === 'trash' && (
        <p className="text-sm text-muted">{t.trashNote}</p>
      )}
    </>
  );
  const emptyTrashEl = (
    <>
      {p.view === 'trash' && total > 0 && (
        <details className="rounded-xl border border-red-300 p-4 dark:border-red-900">
          <summary className="cursor-pointer text-sm font-medium text-red-700 dark:text-red-300">
            {t.emptyTrash}
          </summary>
          <form action={emptyTrash} className="mt-3 space-y-3">
            <p className="text-sm">{plural(total, t.emptyTrashBody)}</p>
            <button
              type="submit"
              className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-800 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
            >
              {fmt(t.deleteN, { n: total })}
            </button>
          </form>
        </details>
      )}
    </>
  );

  if (wide) {
    return (
      <div className="space-y-6">
        {headerEl}
        {noticeEl}
        {chipsEl}
        <div className="card flex flex-col items-center gap-2 rounded-3xl px-6 py-16 text-center">
          <ChevronRightIcon className="size-8 rotate-180 text-accent" />
          <h2 className="font-display text-xl font-semibold">{t.pickTitle}</h2>
          <p className="max-w-sm text-sm text-muted">{t.pickBody}</p>
        </div>
        {emptyTrashEl}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {headerEl}
      {noticeEl}
      <nav
        aria-label={t.listsNav}
        className="flex gap-1 border-b border-border"
      >
        {VIEWS.map((view) => {
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
              {t.views[view]}
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
            {t.search}
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={p.q}
            maxLength={100}
            placeholder={t.searchPlaceholder}
            className="block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          />
        </div>
        <SortSelect value={p.sort} />
        <button type="submit" className={secondaryButton}>
          {t.search}
        </button>
      </form>

      {chipsEl}
      {items.length === 0 ? (
        <EmptyState view={p.view} q={p.q} tag={p.tag} m={m} />
      ) : (
        <>
          <p className="text-sm text-muted" aria-live="polite">
            {from === 1 && to === total
              ? plural(total, m.common.contacts)
              : fmt(t.range, { from, to, total })}
            {p.q ? fmt(t.matching, { q: p.q }) : ''}
            {p.tag ? fmt(t.tagged, { tag: p.tag }) : ''}
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
                <ul className="divide-y divide-border overflow-hidden rounded-xl card">
                  {rows.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={detailHref(p, c.id)}
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
                              ? fmt(t.deletedOn, {
                                  date: formatDate(c.deletedAt, locale),
                                })
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
              aria-label={t.pagesNav}
              className="flex items-center justify-between gap-3"
            >
              {page > 1 ? (
                <Link
                  href={listHref(p, { page: page - 1 })}
                  className={secondaryButton}
                >
                  {m.common.previous}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-sm text-muted">
                {fmt(t.pageOf, { page, last: lastPage })}
              </span>
              {page < lastPage ? (
                <Link
                  href={listHref(p, { page: page + 1 })}
                  className={secondaryButton}
                >
                  {m.common.next}
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}

      {emptyTrashEl}
    </div>
  );
}

function EmptyState({
  view,
  q,
  tag,
  m,
}: {
  view: View;
  q: string;
  tag: string;
  m: Messages;
}) {
  const e = m.contacts.list.empty;
  let title: string;
  let body: string;
  if (tag && !q) {
    title = fmt(e.taggedTitle, { tag });
    body = e.taggedBody;
  } else if (q) {
    title = fmt(e.queryTitle, { q });
    body = e.queryBody;
  } else if (view === 'archived') {
    title = e.archivedTitle;
    body = e.archivedBody;
  } else if (view === 'trash') {
    title = e.trashTitle;
    body = e.trashBody;
  } else {
    title = e.noneTitle;
    body = e.noneBody;
  }
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-muted">{body}</p>
      {!q && !tag && view === 'active' && (
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link href="/contacts/import" className={primaryButton}>
            {e.importVcf}
          </Link>
          <Link href="/contacts/new" className={secondaryButton}>
            {m.contacts.list.newContact}
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
