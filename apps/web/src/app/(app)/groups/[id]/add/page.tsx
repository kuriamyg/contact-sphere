import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { addMembers } from '@/app/actions/groups';
import { Avatar } from '@/components/avatar';
import { Notice } from '@/components/contacts/notice';
import { PAGE_SIZE } from '@/lib/contact-params';
import { listContacts } from '@/lib/contacts';
import { getGroup, ROLE_SUGGESTIONS } from '@/lib/groups';

export const metadata: Metadata = { title: 'Add members · Contact Sphere' };

const input =
  'block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/40';
const button =
  'rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none';

/** Pick contacts to add: search, tick, optionally give them one role. */
export default async function AddMembersPage({
  params,
  searchParams,
}: PageProps<'/groups/[id]/add'>) {
  const { id } = await params;
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 100) : '';
  const pageNo = Math.max(1, Number.parseInt(String(sp.page ?? '1'), 10) || 1);
  const g = await getGroup(id);
  if (!g) notFound();
  const { items, total } = await listContacts({
    q,
    tag: '',
    sort: 'name-asc',
    view: 'active',
    page: pageNo,
  });
  const inGroup = new Set(g.members.map((m) => m.contactId));
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) =>
    `/groups/${g.id}/add?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <div className="max-w-xl space-y-6">
      <Link
        href={`/groups/${g.id}`}
        className="text-sm text-muted hover:underline"
      >
        ← {g.name}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Add members</h1>
      <Notice code={sp.done} />

      <form role="search" className="flex gap-2">
        <label htmlFor="q" className="sr-only">
          Search contacts
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={100}
          placeholder="Name, skill, area, number…"
          className={input}
        />
        <button type="submit" className={button}>
          Search
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-muted">
          {q ? `No contacts match “${q}”.` : 'You have no contacts yet.'}
        </p>
      ) : (
        <form action={addMembers} className="space-y-4">
          <input type="hidden" name="id" value={g.id} />
          <fieldset className="space-y-2">
            <legend className="text-sm text-muted">
              Tick who to add ({total} {total === 1 ? 'contact' : 'contacts'}
              {q ? ` matching “${q}”` : ''})
            </legend>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {items.map((c) => {
                const member = inGroup.has(c.id);
                return (
                  <li key={c.id}>
                    <label
                      className={`flex items-center gap-3 px-3 py-2.5 ${
                        member
                          ? 'opacity-60'
                          : 'cursor-pointer hover:bg-surface'
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="contactId"
                        value={c.id}
                        disabled={member}
                        defaultChecked={member}
                        className="size-5 accent-[var(--accent)]"
                      />
                      <Avatar name={c.displayName} colourKey={c.id} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{c.displayName}</span>
                        <span className="block truncate text-sm text-muted">
                          {member
                            ? 'Already in this group'
                            : (c.primaryPhone?.raw ?? c.organization ?? '')}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
          {lastPage > 1 && (
            <nav
              aria-label="Pages"
              className="flex items-center justify-between text-sm"
            >
              {pageNo > 1 ? (
                <Link href={pageHref(pageNo - 1)} className={button}>
                  Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-muted">
                Page {pageNo} of {lastPage} — ticks on this page only
              </span>
              {pageNo < lastPage ? (
                <Link href={pageHref(pageNo + 1)} className={button}>
                  Next
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
          <div className="space-y-1.5">
            <label htmlFor="role" className="block text-sm font-medium">
              Role for everyone ticked (optional)
            </label>
            <input
              id="role"
              name="role"
              list="roles"
              maxLength={40}
              placeholder="e.g. member"
              className={input}
            />
            <datalist id="roles">
              {ROLE_SUGGESTIONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-foreground px-4 py-3 font-medium text-background hover:opacity-90 focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Add to {g.name}
          </button>
        </form>
      )}
    </div>
  );
}
