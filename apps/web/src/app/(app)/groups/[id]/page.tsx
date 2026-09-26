import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { removeMember, setRole } from '@/app/actions/groups';
import { Avatar } from '@/components/avatar';
import { Notice } from '@/components/contacts/notice';
import { CopyNumbers } from '@/components/groups/copy-numbers';
import {
  DownloadIcon,
  MessageIcon,
  PhoneIcon,
  PlusIcon,
  WhatsAppIcon,
} from '@/components/icons';
import { whatsappHref } from '@/lib/format';
import { getGroup, kindLabel, ROLE_SUGGESTIONS } from '@/lib/groups';

export const metadata: Metadata = { title: 'Group · Contact Sphere' };

const button =
  'inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none';
const icon =
  'inline-flex size-10 items-center justify-center rounded-full border border-border text-muted hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none';

export default async function GroupPage({
  params,
  searchParams,
}: PageProps<'/groups/[id]'>) {
  const { id } = await params;
  const { done } = await searchParams;
  const g = await getGroup(id);
  if (!g) notFound();
  const numbers = g.members
    .map((m) => m.phone?.e164 ?? m.phone?.raw)
    .filter((n): n is string => Boolean(n));

  return (
    <div className="max-w-xl space-y-6">
      <Link href="/groups" className="text-sm text-muted hover:underline">
        ← Groups
      </Link>
      <header className="space-y-1">
        <p className="text-sm font-medium text-accent">{kindLabel(g.kind)}</p>
        <h1 className="text-2xl font-semibold tracking-tight break-words">
          {g.name}
        </h1>
        {g.description && (
          <p className="text-muted break-words">{g.description}</p>
        )}
        <p className="text-sm text-muted">
          {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'}
        </p>
      </header>
      <Notice code={done} />

      <div className="flex flex-wrap gap-2">
        <Link href={`/groups/${g.id}/add`} className={button}>
          <PlusIcon className="size-4" />
          Add members
        </Link>
        {numbers.length > 0 && (
          <>
            <a href={`sms:${numbers.join(',')}`} className={button}>
              <MessageIcon className="size-4" />
              Text everyone
            </a>
            <CopyNumbers numbers={numbers} />
          </>
        )}
        {g.memberCount > 0 && (
          <a href={`/groups/${g.id}/export`} download className={button}>
            <DownloadIcon className="size-4" />
            Export .vcf
          </a>
        )}
        <Link href={`/groups/${g.id}/edit`} className={button}>
          Edit
        </Link>
      </div>
      {numbers.length > 0 && (
        <p className="text-sm text-muted">
          WhatsApp cannot open one chat with many people from a link. Copy the
          numbers, then paste them when you create a WhatsApp group or broadcast
          list — or tap WhatsApp next to each member.
        </p>
      )}

      {g.members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <h2 className="text-lg font-semibold">No members yet</h2>
          <p className="mt-1 text-muted">
            Add them from your contacts, with their role if they have one.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {g.members.map((m) => {
            const dial = m.phone?.e164 ?? m.phone?.raw;
            return (
              <li key={m.contactId} className="space-y-2 px-3 py-3 sm:px-4">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/contacts/${m.contactId}`}
                    className="flex min-w-0 flex-1 items-center gap-3 hover:underline"
                  >
                    <Avatar name={m.displayName} colourKey={m.contactId} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {m.displayName}
                      </span>
                      <span className="block truncate text-sm text-muted">
                        {[m.role, m.phone?.raw].filter(Boolean).join(' · ') ||
                          'No number'}
                      </span>
                    </span>
                  </Link>
                  {dial && (
                    <div className="flex shrink-0 gap-1.5">
                      <a
                        href={`tel:${dial}`}
                        aria-label={`Call ${m.displayName}`}
                        className={icon}
                      >
                        <PhoneIcon className="size-4" />
                      </a>
                      {m.phone?.e164 && (
                        <a
                          href={whatsappHref(m.phone.e164)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`WhatsApp ${m.displayName}`}
                          className={icon}
                        >
                          <WhatsAppIcon className="size-4" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <details>
                  <summary className="cursor-pointer text-sm text-muted">
                    Role or remove
                  </summary>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <form action={setRole} className="flex gap-2">
                      <input type="hidden" name="id" value={g.id} />
                      <input
                        type="hidden"
                        name="contactId"
                        value={m.contactId}
                      />
                      <label
                        className="sr-only"
                        htmlFor={`role-${m.contactId}`}
                      >
                        Role of {m.displayName}
                      </label>
                      <input
                        id={`role-${m.contactId}`}
                        name="role"
                        list="roles"
                        maxLength={40}
                        defaultValue={m.role ?? ''}
                        placeholder="e.g. treasurer"
                        className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
                      />
                      <button type="submit" className={button}>
                        Save
                      </button>
                    </form>
                    <form action={removeMember}>
                      <input type="hidden" name="id" value={g.id} />
                      <input
                        type="hidden"
                        name="contactId"
                        value={m.contactId}
                      />
                      <button
                        type="submit"
                        aria-label={`Remove ${m.displayName} from ${g.name}`}
                        className={`${button} text-red-700 dark:text-red-300`}
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
      <datalist id="roles">
        {ROLE_SUGGESTIONS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
    </div>
  );
}
