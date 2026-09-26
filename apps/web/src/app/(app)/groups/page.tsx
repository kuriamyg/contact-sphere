import type { Metadata } from 'next';
import Link from 'next/link';

import { createGroup } from '@/app/actions/groups';
import { Notice } from '@/components/contacts/notice';
import { ChevronRightIcon } from '@/components/icons';
import { GROUP_KINDS, kindLabel, listGroups } from '@/lib/groups';

export const metadata: Metadata = { title: 'Groups · Contact Sphere' };

const input =
  'block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/40';

export default async function GroupsPage({
  searchParams,
}: PageProps<'/groups'>) {
  const { done } = await searchParams;
  const groups = await listGroups();
  return (
    <div className="max-w-xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Groups</h1>
        <p className="text-muted">
          Your chama, church, family, estate — who is in each, and their role.
        </p>
      </header>
      <Notice code={done} />

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <h2 className="text-lg font-semibold">No groups yet</h2>
          <p className="mt-1 text-muted">
            Start with the one you run or message most — your chama or church.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/groups/${g.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface focus-visible:bg-surface focus-visible:outline-none"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{g.name}</span>
                  <span className="block truncate text-sm text-muted">
                    {kindLabel(g.kind)} · {g.memberCount}{' '}
                    {g.memberCount === 1 ? 'member' : 'members'}
                  </span>
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <details
        className="rounded-xl border border-border p-4"
        open={groups.length === 0}
      >
        <summary className="cursor-pointer font-medium">New group</summary>
        <form action={createGroup} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={80}
              placeholder="e.g. Kasarani Chama"
              className={input}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="kind" className="block text-sm font-medium">
              Kind
            </label>
            <select
              id="kind"
              name="kind"
              defaultValue="chama"
              className={input}
            >
              {GROUP_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="description" className="block text-sm font-medium">
              Notes (optional)
            </label>
            <input
              id="description"
              name="description"
              maxLength={500}
              placeholder="e.g. Meets first Sunday, KES 1,000 a month"
              className={input}
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-foreground px-4 py-2.5 font-medium text-background hover:opacity-90 focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Create group
          </button>
        </form>
      </details>
    </div>
  );
}
