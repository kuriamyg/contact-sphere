import type { Metadata } from 'next';
import Link from 'next/link';

import { followUpDone, markContacted } from '@/app/actions/remember';
import { Avatar } from '@/components/avatar';
import { Notice } from '@/components/contacts/notice';
import { PhoneIcon, WhatsAppIcon } from '@/components/icons';
import { formatDay, whatsappHref } from '@/lib/format';
import { cadenceLabel, getToday, relativeDay } from '@/lib/remember';

export const metadata: Metadata = { title: 'Today · Contact Sphere' };

const icon =
  'inline-flex size-10 items-center justify-center rounded-full border border-border text-muted hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none';
const small =
  'rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none';

type Phone = { raw: string; e164: string | null } | null;

function Reach({
  name,
  phone,
  text,
}: {
  name: string;
  phone: Phone;
  text?: string;
}) {
  if (!phone) return null;
  return (
    <>
      <a
        href={`tel:${phone.e164 ?? phone.raw}`}
        aria-label={`Call ${name}`}
        className={icon}
      >
        <PhoneIcon className="size-4" />
      </a>
      {phone.e164 && (
        <a
          href={whatsappHref(phone.e164, text)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`WhatsApp ${name}`}
          className={icon}
        >
          <WhatsAppIcon className="size-4" />
        </a>
      )}
    </>
  );
}

function Row({
  id,
  name,
  detail,
  children,
}: {
  id: string;
  name: string;
  detail: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-3 sm:px-4">
      <Link
        href={`/contacts/${id}`}
        className="flex min-w-0 flex-1 basis-48 items-center gap-3 hover:underline"
      >
        <Avatar name={name} colourKey={id} />
        <span className="min-w-0">
          <span className="block truncate font-medium">{name}</span>
          <span className="block text-sm text-muted">{detail}</span>
        </span>
      </Link>
      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
    </li>
  );
}

function Section({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {hint && <p className="text-sm text-muted">{hint}</p>}
      <ul className="divide-y divide-border rounded-xl border border-border">
        {children}
      </ul>
    </section>
  );
}

const firstName = (n: string) => n.split(' ')[0];

/** Who to reach today: follow-ups, keep-in-touch, birthdays. */
export default async function TodayPage({ searchParams }: PageProps<'/today'>) {
  const { done } = await searchParams;
  const t = await getToday();
  const nothing =
    t.followUps.length === 0 &&
    t.keepInTouch.length === 0 &&
    t.birthdays.length === 0;

  return (
    <div className="max-w-xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-muted">{formatDay(t.today)}</p>
      </header>
      <Notice code={done} />

      {nothing && (
        <div className="space-y-2 rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <h2 className="text-lg font-semibold">Nothing due today</h2>
          <p className="text-muted">
            On a contact&rsquo;s page, choose how often to keep in touch or add
            a follow-up. Birthdays you save show here two weeks ahead.
          </p>
          <Link
            href="/contacts"
            className="inline-block font-medium text-accent underline"
          >
            Go to contacts
          </Link>
        </div>
      )}

      {t.followUps.length > 0 && (
        <Section id="follow-ups" title="Follow up">
          {t.followUps.map((f) => (
            <Row
              key={f.id}
              id={f.contactId}
              name={f.displayName}
              detail={
                <>
                  <span className="text-foreground">{f.note}</span>
                  <span
                    className={
                      f.daysAway < 0 ? ' text-red-700 dark:text-red-300' : ''
                    }
                  >
                    {' · '}
                    {f.daysAway < 0
                      ? `${-f.daysAway} ${f.daysAway === -1 ? 'day' : 'days'} late`
                      : relativeDay(f.daysAway)}
                  </span>
                </>
              }
            >
              <Reach name={f.displayName} phone={f.phone} />
              <form action={followUpDone}>
                <input type="hidden" name="id" value={f.id} />
                <input type="hidden" name="back" value="/today" />
                <button
                  type="submit"
                  aria-label={`Done: ${f.note}`}
                  className={small}
                >
                  Done
                </button>
              </form>
            </Row>
          ))}
        </Section>
      )}

      {t.keepInTouch.length > 0 && (
        <Section
          id="keep-in-touch"
          title="Keep in touch"
          hint="People you wanted to hear from, most overdue first."
        >
          {t.keepInTouch.map((k) => (
            <Row
              key={k.contactId}
              id={k.contactId}
              name={k.displayName}
              detail={`${cadenceLabel(k.everyDays)} · ${
                k.overdueDays === 0
                  ? 'due today'
                  : `${k.overdueDays} ${k.overdueDays === 1 ? 'day' : 'days'} overdue`
              }`}
            >
              <Reach name={k.displayName} phone={k.phone} />
              <form action={markContacted}>
                <input type="hidden" name="contactId" value={k.contactId} />
                <input type="hidden" name="back" value="/today" />
                <button
                  type="submit"
                  aria-label={`I was in touch with ${k.displayName}`}
                  className={small}
                >
                  Done
                </button>
              </form>
            </Row>
          ))}
        </Section>
      )}

      {t.birthdays.length > 0 && (
        <Section id="birthdays" title="Birthdays">
          {t.birthdays.map((b) => (
            <Row
              key={b.contactId}
              id={b.contactId}
              name={b.displayName}
              detail={
                <>
                  {b.daysAway === 0 ? (
                    <strong className="text-accent">Today 🎉</strong>
                  ) : (
                    `${formatDay(b.on)} · ${relativeDay(b.daysAway)}`
                  )}
                  {b.turning > 0 && b.turning < 130 && ` · turns ${b.turning}`}
                </>
              }
            >
              <Reach
                name={b.displayName}
                phone={b.phone}
                text={`Happy birthday, ${firstName(b.displayName)}! 🎉`}
              />
            </Row>
          ))}
        </Section>
      )}
    </div>
  );
}
