'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { PlusIcon } from '@/components/icons';

export interface PaneGroup {
  id: string;
  name: string;
  kind: string;
  members: string;
}

/**
 * The laptop's left pane on Groups: every group, the open one marked. It
 * lives in the groups layout, so it stays put while a group loads.
 */
export function GroupListPane({
  groups,
  title,
  newLabel,
}: {
  groups: PaneGroup[];
  title: string;
  newLabel: string;
}) {
  const pathname = usePathname();
  return (
    <section
      data-pane
      aria-label={title}
      className="sticky top-10 flex max-h-[calc(100dvh-5rem)] flex-col gap-3 overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <Link
          href="/groups#new-group"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-semibold hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <PlusIcon className="size-4" />
          {newLabel}
        </Link>
      </div>
      <ul className="-mx-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1 pb-2">
        {groups.map((g) => {
          const on =
            pathname === `/groups/${g.id}` ||
            pathname.startsWith(`/groups/${g.id}/`);
          return (
            <li key={g.id}>
              <Link
                href={`/groups/${g.id}`}
                aria-current={on ? 'page' : undefined}
                className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                  on
                    ? 'bg-accent-soft ring-1 ring-accent/40'
                    : 'hover:bg-surface-hover'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {g.name}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {g.kind}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted tabular-nums">
                  {g.members}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
