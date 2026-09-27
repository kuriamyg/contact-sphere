import { GroupListPane } from '@/components/groups/group-list-pane';
import { plural } from '@/i18n/format';
import { getMessages } from '@/i18n/server';
import { kindLabel, listGroupsQuietly } from '@/lib/groups';
import { isWide } from '@/lib/wide';

/** Groups on a laptop: the group list beside whichever group page is open. */
export default async function GroupsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isWide())) return children;
  const [groups, m] = await Promise.all([listGroupsQuietly(), getMessages()]);
  if (groups.length === 0) return children;
  return (
    <div className="grid grid-cols-[20rem_minmax(0,1fr)] gap-8 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <GroupListPane
        title={m.groups.list.listPane}
        newLabel={m.groups.list.newGroup}
        groups={groups.map((g) => ({
          id: g.id,
          name: g.name,
          kind: kindLabel(g.kind, m.groups.kinds),
          members: plural(g.memberCount, m.common.members),
        }))}
      />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
