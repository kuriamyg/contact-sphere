import type { Metadata } from 'next';
import Link from 'next/link';

import { createGroup } from '@/app/actions/groups';
import { Notice } from '@/components/contacts/notice';
import { ChevronRightIcon } from '@/components/icons';
import { plural } from '@/i18n/format';
import { getMessages, pageTitle } from '@/i18n/server';
import { GROUP_KINDS, kindLabel, listGroups } from '@/lib/groups';
import { isWide } from '@/lib/wide';

export const generateMetadata = (): Promise<Metadata> => pageTitle('groups');

const input =
  'block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/40';

export default async function GroupsPage({
  searchParams,
}: PageProps<'/groups'>) {
  const { done } = await searchParams;
  const groups = await listGroups();
  // On a laptop the list sits in the pane beside this page (groups layout).
  const paned = groups.length > 0 && (await isWide());
  const m = await getMessages();
  const t = m.groups.list;
  return (
    <div className="max-w-xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-muted">{t.lead}</p>
      </header>
      <Notice code={done} />

      {paned ? (
        <div className="card flex flex-col items-center gap-2 rounded-3xl px-6 py-14 text-center">
          <ChevronRightIcon className="size-8 rotate-180 text-accent" />
          <h2 className="font-display text-xl font-semibold">{t.pickTitle}</h2>
          <p className="max-w-sm text-sm text-muted">{t.pickBody}</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <h2 className="text-lg font-semibold">{t.noneTitle}</h2>
          <p className="mt-1 text-muted">{t.noneBody}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl card">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/groups/${g.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface focus-visible:bg-surface focus-visible:outline-none"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{g.name}</span>
                  <span className="block truncate text-sm text-muted">
                    {kindLabel(g.kind, m.groups.kinds)} ·{' '}
                    {plural(g.memberCount, m.common.members)}
                  </span>
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <details
        id="new-group"
        className="rounded-xl card p-4"
        open={groups.length === 0 || paned}
      >
        <summary className="cursor-pointer font-medium">{t.newGroup}</summary>
        <form action={createGroup} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-sm font-medium">
              {t.name}
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={80}
              placeholder={t.namePlaceholder}
              className={input}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="kind" className="block text-sm font-medium">
              {t.kind}
            </label>
            <select
              id="kind"
              name="kind"
              defaultValue="chama"
              className={input}
            >
              {GROUP_KINDS.map((k) => (
                <option key={k} value={k}>
                  {m.groups.kinds[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="description" className="block text-sm font-medium">
              {t.notes}
            </label>
            <input
              id="description"
              name="description"
              maxLength={500}
              placeholder={t.notesPlaceholder}
              className={input}
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg btn-primary px-4 py-2.5 font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {t.create}
          </button>
        </form>
      </details>
    </div>
  );
}
