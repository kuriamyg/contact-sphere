import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { addRelationship } from '@/app/actions/relationships';
import { Avatar } from '@/components/avatar';
import { Notice } from '@/components/contacts/notice';
import { fmt } from '@/i18n/format';
import { getMessages, pageTitle } from '@/i18n/server';
import { PAGE_SIZE } from '@/lib/contact-params';
import { getContact, listContacts } from '@/lib/contacts';
import { ROLE_GROUPS } from '@/lib/relationships';

export const generateMetadata = (): Promise<Metadata> => pageTitle('addLink');

const input =
  'block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/40';
const button =
  'rounded-lg border border-border px-4 py-2.5 text-sm font-medium bg-surface hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none';

/** Link this contact to one other: search, pick, say how (P6, ADR 0023). */
export default async function AddLinkPage({
  params,
  searchParams,
}: PageProps<'/contacts/[id]/link'>) {
  const { id } = await params;
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 100) : '';
  const pageNo = Math.max(1, Number.parseInt(String(sp.page ?? '1'), 10) || 1);
  const c = await getContact(id);
  if (!c || c.deletedAt) notFound();
  const m = await getMessages();
  const t = m.relationships.add;
  const { items, total } = await listContacts({
    q,
    tag: '',
    sort: 'name-asc',
    view: 'active',
    page: pageNo,
  });
  const others = items.filter((o) => o.id !== c.id);
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) =>
    `/contacts/${c.id}/link?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;
  const name = c.displayName;

  return (
    <div className="max-w-xl space-y-6">
      <Link
        href={`/contacts/${c.id}`}
        className="text-sm text-muted hover:underline"
      >
        ← {name}
      </Link>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight break-words">
          {fmt(t.title, { name })}
        </h1>
        <p className="text-muted">{fmt(t.lead, { name })}</p>
      </div>
      <Notice code={sp.done} />

      <form role="search" className="flex gap-2">
        <label htmlFor="q" className="sr-only">
          {t.searchContacts}
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={100}
          placeholder={t.searchPlaceholder}
          className={input}
        />
        <button type="submit" className={button}>
          {t.search}
        </button>
      </form>

      {others.length === 0 ? (
        <p className="text-muted">{q ? fmt(t.noMatch, { q }) : t.noContacts}</p>
      ) : (
        <form action={addRelationship} className="space-y-4">
          <input type="hidden" name="contactId" value={c.id} />
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t.who}</legend>
            <ul className="divide-y divide-border rounded-xl card">
              {others.map((o) => (
                <li key={o.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-surface">
                    <input
                      type="radio"
                      name="otherId"
                      value={o.id}
                      required
                      className="size-5 accent-[var(--accent)]"
                    />
                    <Avatar name={o.displayName} colourKey={o.id} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{o.displayName}</span>
                      <span className="block truncate text-sm text-muted">
                        {o.primaryPhone?.raw ?? o.organization ?? ''}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          {lastPage > 1 && (
            <nav
              aria-label={m.contacts.list.pagesNav}
              className="flex items-center justify-between text-sm"
            >
              {pageNo > 1 ? (
                <Link href={pageHref(pageNo - 1)} className={button}>
                  {m.common.previous}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-muted">
                {fmt(t.pageNote, { page: pageNo, last: lastPage })}
              </span>
              {pageNo < lastPage ? (
                <Link href={pageHref(pageNo + 1)} className={button}>
                  {m.common.next}
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
          <div className="space-y-1.5">
            <label htmlFor="role" className="block text-sm font-medium">
              {fmt(t.how, { name })}
            </label>
            <select id="role" name="role" required className={input}>
              {Object.entries(ROLE_GROUPS).map(([group, roles]) => (
                <optgroup
                  key={group}
                  label={
                    m.relationships.roleGroups[
                      group as keyof typeof ROLE_GROUPS
                    ]
                  }
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {fmt(m.relationships.roles[r], { name })}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="label" className="block text-sm font-medium">
              {t.note}
            </label>
            <input
              id="label"
              name="label"
              maxLength={40}
              placeholder={t.notePlaceholder}
              className={input}
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg btn-primary px-4 py-3 font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {t.save}
          </button>
        </form>
      )}
    </div>
  );
}
