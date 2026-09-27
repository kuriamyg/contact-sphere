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
import { fmt, plural } from '@/i18n/format';
import { getMessages, pageTitle } from '@/i18n/server';
import { whatsappHref } from '@/lib/format';
import { getGroup, kindLabel } from '@/lib/groups';

export const generateMetadata = (): Promise<Metadata> => pageTitle('group');

const button =
  'inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium bg-surface hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none';
const icon =
  'inline-flex size-10 items-center justify-center rounded-full border border-border text-muted bg-surface hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none';

export default async function GroupPage({
  params,
  searchParams,
}: PageProps<'/groups/[id]'>) {
  const { id } = await params;
  const { done } = await searchParams;
  const g = await getGroup(id);
  if (!g) notFound();
  const m = await getMessages();
  const t = m.groups.detail;
  const numbers = g.members
    .map((mem) => mem.phone?.e164 ?? mem.phone?.raw)
    .filter((n): n is string => Boolean(n));

  return (
    <div className="max-w-xl space-y-6 lg:max-w-3xl">
      <Link
        href="/groups"
        className="text-sm text-muted hover:underline lg:hidden"
      >
        {t.back}
      </Link>
      <header className="space-y-1">
        <p className="text-sm font-medium text-accent">
          {kindLabel(g.kind, m.groups.kinds)}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight break-words">
          {g.name}
        </h1>
        {g.description && (
          <p className="text-muted break-words">{g.description}</p>
        )}
        <p className="text-sm text-muted">
          {plural(g.memberCount, m.common.members)}
        </p>
      </header>
      <Notice code={done} />

      <div className="flex flex-wrap gap-2">
        <Link href={`/groups/${g.id}/add`} className={button}>
          <PlusIcon className="size-4" />
          {t.addMembers}
        </Link>
        {numbers.length > 0 && (
          <>
            <Link href={`/groups/${g.id}/text`} className={button}>
              <MessageIcon className="size-4" />
              {t.textEveryone}
            </Link>
            <CopyNumbers numbers={numbers} />
          </>
        )}
        {g.memberCount > 0 && (
          <a href={`/groups/${g.id}/export`} download className={button}>
            <DownloadIcon className="size-4" />
            {t.exportVcf}
          </a>
        )}
        <Link href={`/groups/${g.id}/edit`} className={button}>
          {t.edit}
        </Link>
      </div>
      {numbers.length > 0 && (
        <p className="text-sm text-muted">{t.whatsappNote}</p>
      )}

      {g.members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <h2 className="text-lg font-semibold">{t.noMembersTitle}</h2>
          <p className="mt-1 text-muted">{t.noMembersBody}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl card">
          {g.members.map((mem) => {
            const dial = mem.phone?.e164 ?? mem.phone?.raw;
            return (
              <li key={mem.contactId} className="space-y-2 px-3 py-3 sm:px-4">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/contacts/${mem.contactId}`}
                    className="flex min-w-0 flex-1 items-center gap-3 hover:underline"
                  >
                    <Avatar name={mem.displayName} colourKey={mem.contactId} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {mem.displayName}
                      </span>
                      <span className="block truncate text-sm text-muted">
                        {[mem.role, mem.phone?.raw]
                          .filter(Boolean)
                          .join(' · ') || t.noNumber}
                      </span>
                    </span>
                  </Link>
                  {dial && (
                    <div className="flex shrink-0 gap-1.5">
                      <a
                        href={`tel:${dial}`}
                        aria-label={fmt(m.common.callName, {
                          name: mem.displayName,
                        })}
                        className={icon}
                      >
                        <PhoneIcon className="size-4" />
                      </a>
                      {mem.phone?.e164 && (
                        <a
                          href={whatsappHref(mem.phone.e164)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={fmt(m.common.whatsappName, {
                            name: mem.displayName,
                          })}
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
                    {t.roleOrRemove}
                  </summary>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <form action={setRole} className="flex gap-2">
                      <input type="hidden" name="id" value={g.id} />
                      <input
                        type="hidden"
                        name="contactId"
                        value={mem.contactId}
                      />
                      <label
                        className="sr-only"
                        htmlFor={`role-${mem.contactId}`}
                      >
                        {fmt(t.roleOf, { name: mem.displayName })}
                      </label>
                      <input
                        id={`role-${mem.contactId}`}
                        name="role"
                        list="roles"
                        maxLength={40}
                        defaultValue={mem.role ?? ''}
                        placeholder={t.rolePlaceholder}
                        className="w-40 rounded-lg border border-border bg-surface px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
                      />
                      <button type="submit" className={button}>
                        {t.save}
                      </button>
                    </form>
                    <form action={removeMember}>
                      <input type="hidden" name="id" value={g.id} />
                      <input
                        type="hidden"
                        name="contactId"
                        value={mem.contactId}
                      />
                      <button
                        type="submit"
                        aria-label={fmt(t.removeFrom, {
                          name: mem.displayName,
                          group: g.name,
                        })}
                        className={`${button} text-red-700 dark:text-red-300`}
                      >
                        {t.remove}
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
        {m.groups.roles.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
    </div>
  );
}
