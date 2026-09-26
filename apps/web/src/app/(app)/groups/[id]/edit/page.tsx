import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { deleteGroup, updateGroup } from '@/app/actions/groups';
import { Notice } from '@/components/contacts/notice';
import { getGroup, GROUP_KINDS } from '@/lib/groups';

export const metadata: Metadata = { title: 'Edit group · Contact Sphere' };

const input =
  'block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/40';

export default async function EditGroupPage({
  params,
  searchParams,
}: PageProps<'/groups/[id]/edit'>) {
  const { id } = await params;
  const { done } = await searchParams;
  const g = await getGroup(id);
  if (!g) notFound();
  return (
    <div className="max-w-xl space-y-6">
      <Link
        href={`/groups/${g.id}`}
        className="text-sm text-muted hover:underline"
      >
        ← {g.name}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Edit group</h1>
      <Notice code={done} />
      <form action={updateGroup} className="space-y-4">
        <input type="hidden" name="id" value={g.id} />
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={80}
            defaultValue={g.name}
            className={input}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="kind" className="block text-sm font-medium">
            Kind
          </label>
          <select id="kind" name="kind" defaultValue={g.kind} className={input}>
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
            defaultValue={g.description ?? ''}
            className={input}
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-foreground px-4 py-2.5 font-medium text-background hover:opacity-90 focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Save
        </button>
      </form>
      <details className="rounded-xl border border-red-300 p-4 dark:border-red-900">
        <summary className="cursor-pointer text-sm font-medium text-red-700 dark:text-red-300">
          Delete this group
        </summary>
        <form action={deleteGroup} className="mt-3 space-y-3">
          <input type="hidden" name="id" value={g.id} />
          <p className="text-sm">
            The group and its roles are deleted. Its {g.memberCount}{' '}
            {g.memberCount === 1 ? 'contact stays' : 'contacts stay'} in your
            contacts.
          </p>
          <button
            type="submit"
            className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-800 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
          >
            Delete group
          </button>
        </form>
      </details>
    </div>
  );
}
