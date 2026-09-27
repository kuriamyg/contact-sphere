import Link from 'next/link';

import { Avatar } from '@/components/avatar';
import { SortSelect } from '@/components/contacts/sort-select';
import { fmt, plural } from '@/i18n/format';
import { getLocale, getMessages } from '@/i18n/server';
import { indexLetter } from '@/lib/avatar';
import {
  detailHref,
  type ListParams,
  listHref,
  PAGE_SIZE,
  type View,
} from '@/lib/contact-params';
import { type ContactSummary, listContacts } from '@/lib/contacts';
import { formatDate } from '@/lib/format';

const VIEWS: View[] = ['active', 'archived', 'trash'];
const small =
  'rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none';

/**
 * The laptop's left pane: the same list as the Contacts page (same search,
 * skill, sort, view and page), compact, with the open contact marked. It
 * scrolls on its own beside the page it sits next to.
 */
export async function ContactListPane({
  p,
  selectedId,
}: {
  p: ListParams;
  selectedId: string | null;
}) {
  const [{ items, total, page }, m, locale] = await Promise.all([
    listContacts(p),
    getMessages(),
    getLocale(),
  ]);
  const t = m.contacts.list;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const byLetter = p.sort.startsWith('name') && !p.q && !p.tag;
  return (
    <section
      data-pane
      aria-label={t.listPane}
      className="sticky top-10 flex max-h-[calc(100dvh-5rem)] flex-col gap-3 overflow-hidden"
    >
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
      <form role="search" action="/contacts" className="flex gap-2">
        {p.view !== 'active' && (
          <input type="hidden" name="view" value={p.view} />
        )}
        {p.tag && <input type="hidden" name="tag" value={p.tag} />}
        <label htmlFor="q" className="sr-only">
          {t.search}
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={p.q}
          maxLength={100}
          placeholder={t.searchPlaceholder}
          className="block h-[42px] w-full min-w-0 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        <SortSelect value={p.sort} compact />
      </form>
      {p.tag && (
        <Link
          href={listHref(p, { tag: '', page: 1 })}
          aria-label={fmt(t.stopFilter, { tag: p.tag })}
          className="inline-flex items-center gap-1 self-start rounded-full bg-accent px-3 py-1 text-sm font-medium text-background"
        >
          {p.tag}
          <span aria-hidden="true">×</span>
        </Link>
      )}
      <p className="text-xs text-muted" aria-live="polite">
        {plural(total, m.common.contacts)}
        {p.q ? fmt(t.matching, { q: p.q }) : ''}
      </p>
      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-2">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
            {p.q ? fmt(t.empty.queryTitle, { q: p.q }) : t.empty.noneTitle}
          </p>
        ) : (
          <div className="space-y-3">
            {groups(items, byLetter).map(({ letter, rows }) => (
              <section key={letter ?? 'all'} aria-label={letter ?? undefined}>
                {letter && (
                  <h2 className="mb-1 px-2 text-xs font-bold text-accent">
                    {letter}
                  </h2>
                )}
                <ul className="space-y-0.5">
                  {rows.map((c) => {
                    const on = c.id === selectedId;
                    return (
                      <li key={c.id}>
                        <Link
                          href={detailHref(p, c.id)}
                          prefetch={false}
                          aria-current={on ? 'page' : undefined}
                          className={`flex items-center gap-3 rounded-xl px-2.5 py-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                            on
                              ? 'bg-accent-soft ring-1 ring-accent/40'
                              : 'hover:bg-surface-hover'
                          }`}
                        >
                          <Avatar name={c.displayName} colourKey={c.id} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">
                              {c.displayName}
                            </span>
                            <span className="block truncate text-xs text-muted">
                              {p.view === 'trash' && c.deletedAt
                                ? fmt(t.deletedOn, {
                                    date: formatDate(c.deletedAt, locale),
                                  })
                                : [
                                    c.primaryPhone?.raw ?? c.primaryEmail,
                                    c.organization,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
      {lastPage > 1 && (
        <nav
          aria-label={t.pagesNav}
          className="flex items-center justify-between gap-2 border-t border-border pt-2"
        >
          {page > 1 ? (
            <Link href={listHref(p, { page: page - 1 })} className={small}>
              {m.common.previous}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted">
            {fmt(t.pageOf, { page, last: lastPage })}
          </span>
          {page < lastPage ? (
            <Link href={listHref(p, { page: page + 1 })} className={small}>
              {m.common.next}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}

function groups(
  items: ContactSummary[],
  byLetter: boolean,
): { letter: string | null; rows: ContactSummary[] }[] {
  if (!byLetter) return [{ letter: null, rows: items }];
  const out: { letter: string; rows: ContactSummary[] }[] = [];
  for (const c of items) {
    const letter = indexLetter(c.displayName);
    const last = out[out.length - 1];
    if (last?.letter === letter) last.rows.push(c);
    else out.push({ letter, rows: [c] });
  }
  return out;
}
