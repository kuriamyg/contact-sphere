import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  archiveContact,
  deleteContactForGood,
  restoreContact,
  trashContact,
  unarchiveContact,
} from '@/app/actions/contacts';
import { addToGroup } from '@/app/actions/groups';
import { undoMerge } from '@/app/actions/merge';
import { setCard } from '@/app/actions/reach';
import {
  addFollowUp,
  deleteFollowUp,
  followUpDone,
  markContacted,
  setKeepInTouch,
} from '@/app/actions/remember';
import { Avatar } from '@/components/avatar';
import { Notice } from '@/components/contacts/notice';
import {
  MailIcon,
  MessageIcon,
  PhoneIcon,
  QrIcon,
  WhatsAppIcon,
} from '@/components/icons';
import {
  getContact,
  markUsed,
  type Phone,
  undoableMerges,
} from '@/lib/contacts';
import type { Messages } from '@/i18n/en';
import { groupsForContact, listGroupsQuietly } from '@/lib/groups';
import { fmt, plural } from '@/i18n/format';
import { getLocale, getMessages, pageTitle } from '@/i18n/server';
import { CADENCE_DAYS, relativeDay, remindersFor } from '@/lib/remember';
import {
  formatBirthday,
  formatDate,
  formatDateTime,
  formatDay,
  whatsappHref,
} from '@/lib/format';

export const generateMetadata = (): Promise<Metadata> => pageTitle('contact');

const button =
  'rounded-lg border border-border px-4 py-2.5 text-sm font-medium bg-surface hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none';

export default async function ContactPage({
  params,
  searchParams,
}: PageProps<'/contacts/[id]'>) {
  const { id } = await params;
  const { done } = await searchParams;
  const c = await getContact(id);
  if (!c) notFound();
  // Opening a contact is what "last used" means (ADR 0007).
  if (!c.deletedAt) await markUsed(c.id).catch(() => undefined);
  const [merges, groups, allGroups, reminders] = c.deletedAt
    ? [[], [], [], null]
    : await Promise.all([
        undoableMerges(c.id),
        groupsForContact(c.id),
        listGroupsQuietly(),
        remindersFor(c.id),
      ]);
  const [m, locale] = await Promise.all([getMessages(), getLocale()]);
  const t = m.contacts.detail;
  const back = `/contacts/${c.id}`;
  const joinable = allGroups.filter((g) => !groups.some((x) => x.id === g.id));

  // Absent only while an older API is still deploying.
  const tags = c.tags ?? [];
  const subtitle = [c.jobTitle, c.organization].filter(Boolean).join(' · ');
  const primary = c.phones[0];

  return (
    <article className="max-w-xl space-y-8">
      <Link href="/contacts" className="text-sm text-muted hover:underline">
        {t.back}
      </Link>

      <Notice code={done} />

      {c.deletedAt && c.purgeAt && (
        <div
          role="status"
          className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
        >
          <p>
            {t.inTrash} <strong>{formatDate(c.purgeAt, locale)}</strong>.
          </p>
          <div className="flex flex-wrap gap-3">
            <form action={restoreContact}>
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" className={button}>
                {t.restore}
              </button>
            </form>
            <details>
              <summary className={`${button} cursor-pointer list-none`}>
                {t.deleteForGood}
              </summary>
              <form action={deleteContactForGood} className="mt-3 space-y-2">
                <input type="hidden" name="id" value={c.id} />
                <p className="text-sm">{t.deleteWarning}</p>
                <button
                  type="submit"
                  className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-800 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
                >
                  {t.deleteForGood}
                </button>
              </form>
            </details>
          </div>
        </div>
      )}

      <header className="flex flex-col items-center gap-3 text-center">
        <Avatar name={c.displayName} colourKey={c.id} size="lg" />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight break-words">
            {c.displayName}
          </h1>
          {c.nickname && <p className="text-muted">“{c.nickname}”</p>}
          {subtitle && <p className="text-muted">{subtitle}</p>}
          {c.archivedAt && !c.deletedAt && (
            <p className="text-sm text-muted">{t.archived}</p>
          )}
        </div>
        {!c.deletedAt && (primary || c.emails[0]) && (
          <div className="flex flex-wrap justify-center gap-3 pt-1">
            {primary && (
              <>
                <QuickAction
                  href={`tel:${primary.e164 ?? primary.raw}`}
                  label={m.common.call}
                >
                  <PhoneIcon />
                </QuickAction>
                <QuickAction
                  href={`sms:${primary.e164 ?? primary.raw}`}
                  label={m.common.sms}
                >
                  <MessageIcon />
                </QuickAction>
                {primary.e164 && (
                  <QuickAction
                    href={whatsappHref(primary.e164)}
                    label={m.common.whatsapp}
                    external
                  >
                    <WhatsAppIcon />
                  </QuickAction>
                )}
              </>
            )}
            {c.emails[0] && (
              <QuickAction
                href={`mailto:${c.emails[0].address}`}
                label={m.common.email}
              >
                <MailIcon />
              </QuickAction>
            )}
          </div>
        )}
      </header>

      {c.phones.length > 0 && (
        <section aria-labelledby="phones" className="space-y-3">
          <h2
            id="phones"
            className="text-sm font-semibold text-muted uppercase"
          >
            {t.phone}
          </h2>
          <ul className="space-y-4">
            {c.phones.map((p, i) => (
              <PhoneRow key={i} phone={p} primary={i === 0} t={t} />
            ))}
          </ul>
        </section>
      )}

      {c.emails.length > 0 && (
        <section aria-labelledby="emails" className="space-y-3">
          <h2
            id="emails"
            className="text-sm font-semibold text-muted uppercase"
          >
            {t.email}
          </h2>
          <ul className="space-y-3">
            {c.emails.map((e, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span className="min-w-0 break-all">
                  {e.address}
                  {e.label && (
                    <span className="ml-2 text-sm text-muted">{e.label}</span>
                  )}
                </span>
                <IconAction
                  href={`mailto:${e.address}`}
                  label={fmt(t.emailTo, { address: e.address })}
                >
                  <MailIcon className="size-4" />
                </IconAction>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(tags.length > 0 || c.area || c.metThrough) && (
        <section aria-labelledby="know" className="space-y-3">
          <h2 id="know" className="text-sm font-semibold text-muted uppercase">
            {t.whoTheyAre}
          </h2>
          {tags.length > 0 && (
            <ul aria-label={t.skills} className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <li key={t}>
                  <Link
                    href={`/contacts?tag=${encodeURIComponent(t)}`}
                    className="inline-block rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent hover:underline"
                  >
                    {t}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {(c.area || c.metThrough) && (
            <dl className="grid gap-3 sm:grid-cols-2">
              {c.area && (
                <div>
                  <dt className="text-sm text-muted">{t.area}</dt>
                  <dd className="break-words">{c.area}</dd>
                </div>
              )}
              {c.metThrough && (
                <div>
                  <dt className="text-sm text-muted">{t.metThrough}</dt>
                  <dd className="break-words">{c.metThrough}</dd>
                </div>
              )}
            </dl>
          )}
        </section>
      )}

      {!c.deletedAt && (groups.length > 0 || joinable.length > 0) && (
        <section aria-labelledby="groups" className="space-y-3">
          <h2
            id="groups"
            className="text-sm font-semibold text-muted uppercase"
          >
            {t.groups}
          </h2>
          {groups.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {groups.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/groups/${g.id}`}
                    className="inline-block rounded-full border border-border px-3 py-1 text-sm bg-surface hover:bg-surface-hover"
                  >
                    {g.name}
                    {g.role && <span className="text-muted"> · {g.role}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {joinable.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm font-medium text-accent">
                {t.addToGroup}
              </summary>
              <form action={addToGroup} className="mt-2 flex flex-wrap gap-2">
                <input type="hidden" name="contactId" value={c.id} />
                <label htmlFor="groupId" className="sr-only">
                  {t.group}
                </label>
                <select
                  id="groupId"
                  name="groupId"
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-base"
                >
                  {joinable.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <label htmlFor="role" className="sr-only">
                  {t.roleOptional}
                </label>
                <input
                  id="role"
                  name="role"
                  maxLength={40}
                  placeholder={t.roleOptional}
                  className="w-40 rounded-lg border border-border bg-surface px-3 py-2 text-base"
                />
                <button type="submit" className={button}>
                  {t.add}
                </button>
              </form>
            </details>
          )}
        </section>
      )}

      {reminders && (
        <section aria-labelledby="touch" className="space-y-4">
          <h2 id="touch" className="text-sm font-semibold text-muted uppercase">
            {t.stayInTouch}
          </h2>
          <div className="space-y-3 rounded-xl card p-4">
            <p className="text-sm">
              {reminders.lastContactedAt
                ? fmt(t.lastInTouch, {
                    date: formatDate(reminders.lastContactedAt, locale),
                  })
                : t.notYet}
              {reminders.due &&
                (reminders.due.overdueDays >= 0 ? (
                  <strong className="text-red-700 dark:text-red-300">
                    {' · '}
                    {reminders.due.overdueDays === 0
                      ? t.dueToday
                      : plural(reminders.due.overdueDays, t.overdue)}
                  </strong>
                ) : (
                  fmt(t.nextDue, {
                    when: relativeDay(-reminders.due.overdueDays, m.remember),
                  })
                ))}
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <form action={setKeepInTouch} className="flex gap-2">
                <input type="hidden" name="contactId" value={c.id} />
                <label htmlFor="days" className="sr-only">
                  {t.keepInTouch}
                </label>
                <select
                  id="days"
                  name="days"
                  defaultValue={reminders.keepInTouchDays ?? ''}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-base"
                >
                  <option value="">{t.noReminder}</option>
                  {CADENCE_DAYS.map((d) => (
                    <option key={d} value={d}>
                      {
                        m.remember.cadences[
                          String(d) as keyof typeof m.remember.cadences
                        ]
                      }
                    </option>
                  ))}
                </select>
                <button type="submit" className={button}>
                  {t.save}
                </button>
              </form>
              <form action={markContacted}>
                <input type="hidden" name="contactId" value={c.id} />
                <input type="hidden" name="back" value={back} />
                <button type="submit" className={button}>
                  {t.inTouchToday}
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">{t.followUps}</h3>
            {reminders.followUps.length > 0 && (
              <ul className="divide-y divide-border rounded-xl card">
                {reminders.followUps.map((f) => (
                  <li
                    key={f.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  >
                    <span
                      className={`min-w-0 ${f.doneAt ? 'text-muted line-through' : ''}`}
                    >
                      <span className="block break-words">{f.note}</span>
                      <span className="block text-sm text-muted">
                        {formatDay(f.dueOn, locale)}
                        {f.doneAt && t.doneSuffix}
                      </span>
                    </span>
                    <span className="flex gap-2">
                      {!f.doneAt && (
                        <form action={followUpDone}>
                          <input type="hidden" name="id" value={f.id} />
                          <input type="hidden" name="back" value={back} />
                          <button
                            type="submit"
                            aria-label={fmt(t.doneLabel, { note: f.note })}
                            className={button}
                          >
                            {t.done}
                          </button>
                        </form>
                      )}
                      <form action={deleteFollowUp}>
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="back" value={back} />
                        <button
                          type="submit"
                          aria-label={fmt(t.deleteFollowUp, { note: f.note })}
                          className={button}
                        >
                          {t.delete}
                        </button>
                      </form>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <form action={addFollowUp} className="flex flex-wrap gap-2">
              <input type="hidden" name="contactId" value={c.id} />
              <label htmlFor="dueOn" className="sr-only">
                {t.followUpDate}
              </label>
              <input
                id="dueOn"
                name="dueOn"
                type="date"
                required
                min="2000-01-01"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-base"
              />
              <label htmlFor="note" className="sr-only">
                {t.followUpNote}
              </label>
              <input
                id="note"
                name="note"
                required
                maxLength={200}
                placeholder={t.followUpPlaceholder}
                className="min-w-0 flex-1 basis-48 rounded-lg border border-border bg-surface px-3 py-2 text-base"
              />
              <button type="submit" className={button}>
                {t.addFollowUp}
              </button>
            </form>
          </div>
        </section>
      )}

      {(c.birthday || c.notes) && (
        <section aria-labelledby="details" className="space-y-3">
          <h2
            id="details"
            className="text-sm font-semibold text-muted uppercase"
          >
            {t.details}
          </h2>
          <dl className="space-y-3">
            {c.birthday && (
              <div>
                <dt className="text-sm text-muted">{t.birthday}</dt>
                <dd>{formatBirthday(c.birthday, locale)}</dd>
              </div>
            )}
            {c.notes && (
              <div>
                <dt className="text-sm text-muted">{t.notes}</dt>
                <dd className="whitespace-pre-wrap break-words">{c.notes}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {merges.length > 0 && (
        <section
          aria-labelledby="merges"
          className="space-y-3 rounded-xl card p-4"
        >
          <h2 id="merges" className="font-semibold">
            {t.merged}
          </h2>
          <p className="text-sm text-muted">{t.mergedExplain}</p>
          <ul className="space-y-2">
            {merges.map((mg) => (
              <li
                key={mg.id}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span className="min-w-0 break-words">
                  {mg.mergedName}
                  <span className="ml-2 text-sm text-muted">
                    {fmt(t.mergedOn, {
                      date: formatDateTime(mg.createdAt, locale),
                    })}
                  </span>
                </span>
                <form action={undoMerge}>
                  <input type="hidden" name="mergeRecordId" value={mg.id} />
                  <input type="hidden" name="contactId" value={c.id} />
                  <button
                    type="submit"
                    className={button}
                    aria-label={fmt(t.undoMergeWith, { name: mg.mergedName })}
                  >
                    {t.undoMerge}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-sm text-muted">
        {fmt(t.savedEdited, {
          created: formatDate(c.createdAt, locale),
          updated: formatDateTime(c.updatedAt, locale),
        })}
      </p>

      {!c.deletedAt && (
        <div className="flex flex-wrap gap-3 border-t border-border pt-6">
          <Link href={`/contacts/${c.id}/edit`} className={button}>
            {t.edit}
          </Link>
          {(c.phones.length > 0 || c.emails.length > 0) && (
            <Link href={`/contacts/${c.id}/qr`} className={button}>
              <QrIcon className="size-4" />
              {t.shareQr}
            </Link>
          )}
          <form action={setCard}>
            <input type="hidden" name="contactId" value={c.id} />
            <button type="submit" className={button}>
              {t.thisIsMe}
            </button>
          </form>
          <form action={c.archivedAt ? unarchiveContact : archiveContact}>
            <input type="hidden" name="id" value={c.id} />
            <button type="submit" className={button}>
              {c.archivedAt ? t.unarchive : t.archive}
            </button>
          </form>
          <form action={trashContact}>
            <input type="hidden" name="id" value={c.id} />
            <button
              type="submit"
              className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
            >
              {t.moveToTrash}
            </button>
          </form>
        </div>
      )}
    </article>
  );
}

/** A number with compact one-tap actions, each labelled with the number. */
function PhoneRow({
  phone,
  primary,
  t,
}: {
  phone: Phone;
  primary: boolean;
  t: Messages['contacts']['detail'];
}) {
  const dial = phone.e164 ?? phone.raw;
  return (
    <li className="flex items-center justify-between gap-3">
      <p className="min-w-0">
        <span className="block text-lg break-all">{phone.raw}</span>
        {(phone.label || primary) && (
          <span className="text-sm text-muted">
            {[phone.label, primary ? t.primary : null]
              .filter(Boolean)
              .join(' · ')}
          </span>
        )}
      </p>
      <div className="flex shrink-0 gap-1.5">
        <IconAction
          href={`tel:${dial}`}
          label={fmt(t.callNumber, { number: phone.raw })}
        >
          <PhoneIcon className="size-4" />
        </IconAction>
        <IconAction
          href={`sms:${dial}`}
          label={fmt(t.smsNumber, { number: phone.raw })}
        >
          <MessageIcon className="size-4" />
        </IconAction>
        {phone.e164 && (
          <IconAction
            href={whatsappHref(phone.e164)}
            label={fmt(t.whatsappNumber, { number: phone.raw })}
            external
          >
            <WhatsAppIcon className="size-4" />
          </IconAction>
        )}
      </div>
    </li>
  );
}

function IconAction({
  href,
  label,
  external = false,
  children,
}: {
  href: string;
  label: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="inline-flex size-10 items-center justify-center rounded-full border border-border text-muted bg-surface hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
    >
      {children}
    </a>
  );
}

/** A round one-tap action (call, SMS, WhatsApp, email) with its label. */
function QuickAction({
  href,
  label,
  external = false,
  children,
}: {
  href: string;
  label: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="group flex w-16 flex-col items-center gap-1 text-xs font-medium focus-visible:outline-none"
    >
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-background group-focus-visible:ring-2 group-focus-visible:ring-accent group-focus-visible:ring-offset-2">
        {children}
      </span>
      {label}
    </a>
  );
}
