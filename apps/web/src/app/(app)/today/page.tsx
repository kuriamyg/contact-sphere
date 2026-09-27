import type { Metadata } from 'next';
import Link from 'next/link';

import { followUpDone, markContacted } from '@/app/actions/remember';
import { Avatar } from '@/components/avatar';
import { Notice } from '@/components/contacts/notice';
import {
  CheckIcon,
  ChevronRightIcon,
  MessageIcon,
  PhoneIcon,
  PlusIcon,
  QrIcon,
  WhatsAppIcon,
} from '@/components/icons';
import type { Messages } from '@/i18n/en';
import { fmt, plural } from '@/i18n/format';
import { getLocale, getMessages, pageTitle } from '@/i18n/server';
import { requireUser } from '@/lib/auth';
import { formatDay, whatsappHref } from '@/lib/format';
import {
  cadenceLabel,
  getToday,
  relativeDay,
  type TodayView,
} from '@/lib/remember';

export const generateMetadata = (): Promise<Metadata> => pageTitle('today');

const icon =
  'inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-muted hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none';
const done =
  'inline-flex size-10 items-center justify-center rounded-xl border border-accent/40 bg-accent-soft text-accent hover:brightness-110 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none';

type Phone = { raw: string; e164: string | null } | null;

function Reach({
  name,
  phone,
  text,
  c,
}: {
  name: string;
  phone: Phone;
  text?: string;
  c: Messages['common'];
}) {
  if (!phone) return null;
  return (
    <>
      <a
        href={`tel:${phone.e164 ?? phone.raw}`}
        aria-label={fmt(c.callName, { name })}
        className={icon}
      >
        <PhoneIcon className="size-4" />
      </a>
      {phone.e164 && (
        <a
          href={whatsappHref(phone.e164, text)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={fmt(c.whatsappName, { name })}
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
        className="flex min-w-0 flex-1 basis-48 items-center gap-3 rounded-lg hover:underline focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <Avatar name={name} colourKey={id} />
        <span className="min-w-0">
          <span className="block truncate font-bold">{name}</span>
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
    <section aria-labelledby={id} className="scroll-mt-20 space-y-2">
      <h2
        id={id}
        className="text-xs font-bold tracking-wider text-muted uppercase"
      >
        {title}
      </h2>
      {hint && <p className="text-sm text-muted">{hint}</p>}
      <ul className="card divide-y divide-border rounded-2xl">{children}</ul>
    </section>
  );
}

const firstName = (n: string) => n.split(/[\s@]/)[0];

/** Nairobi time (UTC+3, no daylight saving). */
function greeting(t: Messages['today'], now = new Date()): string {
  const h = (now.getUTCHours() + 3) % 24;
  if (h < 12) return t.morning;
  if (h < 17) return t.afternoon;
  return t.evening;
}

/** The one person to reach first: a birthday today, then the most urgent. */
function spotlight(t: TodayView, m: Messages) {
  const b = t.birthdays.find((x) => x.daysAway === 0);
  if (b) {
    return {
      id: b.contactId,
      name: b.displayName,
      phone: b.phone,
      line:
        b.turning > 0 && b.turning < 130
          ? fmt(m.today.turnsToday, { n: b.turning })
          : m.today.birthdayToday,
      text: fmt(m.today.happyBirthday, { name: firstName(b.displayName) }),
      message: m.today.sayHappy,
    };
  }
  const f = t.followUps.find((x) => x.daysAway <= 0);
  if (f) {
    return {
      id: f.contactId,
      name: f.displayName,
      phone: f.phone,
      line: f.note,
      text: undefined,
      message: m.today.message,
    };
  }
  const k = t.keepInTouch[0];
  if (k) {
    return {
      id: k.contactId,
      name: k.displayName,
      phone: k.phone,
      line: fmt(m.today.keepLine, {
        cadence: cadenceLabel(k.everyDays, m.remember),
      }),
      text: undefined,
      message: m.today.message,
    };
  }
  return null;
}

function Stat({ href, n, label }: { href: string; n: number; label: string }) {
  return (
    <a
      href={href}
      className="card flex flex-col gap-0.5 rounded-2xl p-3 hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
    >
      <span className="font-display text-2xl font-semibold">{n}</span>
      <span className="text-xs text-muted">{label}</span>
    </a>
  );
}

function QuickActions({ t }: { t: Messages['today'] }) {
  const tile =
    'card flex min-h-16 flex-col px-1.5 py-2 text-center leading-tight items-center justify-center gap-1 rounded-2xl text-xs font-semibold hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none';
  return (
    <section aria-labelledby="quick" className="space-y-2">
      <h2
        id="quick"
        className="text-xs font-bold tracking-wider text-muted uppercase"
      >
        {t.quick}
      </h2>
      <div className="grid grid-cols-3 gap-2.5">
        <Link href="/contacts/new" className={tile}>
          <PlusIcon className="size-[18px] text-accent" />
          {t.newContact}
        </Link>
        <Link href="/groups" className={tile}>
          <MessageIcon className="size-[18px] text-violet" />
          {t.textGroup}
        </Link>
        <Link href="/card" className={tile}>
          <QrIcon className="size-[18px] text-sky-500" />
          {t.myCard}
        </Link>
      </div>
    </section>
  );
}

function Checklist({
  setup,
  t,
}: {
  setup: NonNullable<TodayView['setup']>;
  t: Messages['today'];
}) {
  const steps = [
    {
      done: setup.contacts > 0,
      label: t.steps.import,
      href: '/contacts/import',
    },
    {
      done: setup.birthdays > 0,
      label: t.steps.birthdays,
      href: '/contacts',
    },
    {
      done: setup.keepInTouch > 0,
      label: t.steps.keepInTouch,
      href: '/contacts',
    },
  ];
  const count = steps.filter((s) => s.done).length;
  if (count === steps.length) return null;
  return (
    <section aria-labelledby="start" className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="start"
          className="text-xs font-bold tracking-wider text-muted uppercase"
        >
          {fmt(t.start, { done: count, total: steps.length })}
        </h2>
        <div
          className="h-1.5 w-24 overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-label={t.setupProgress}
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={count}
        >
          <div
            className={`h-full rounded-full bg-gradient-to-r from-emerald-500 to-violet-500 ${
              ['w-0', 'w-1/3', 'w-2/3', 'w-full'][count]
            }`}
          />
        </div>
      </div>
      <ul className="card divide-y divide-border rounded-2xl">
        {steps.map((s) => (
          <li key={s.label}>
            {s.done ? (
              <p className="flex items-center gap-3 px-4 py-3.5 text-muted">
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-accent text-background">
                  <CheckIcon className="size-4" />
                </span>
                <span className="line-through">{s.label}</span>
              </p>
            ) : (
              <Link
                href={s.href}
                className="flex items-center gap-3 rounded-2xl px-4 py-3.5 font-semibold hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              >
                <span
                  aria-hidden="true"
                  className="size-7 rounded-full border-2 border-border"
                />
                <span className="flex-1">{s.label}</span>
                <ChevronRightIcon className="size-4 text-muted" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Who to reach today: follow-ups, keep-in-touch, birthdays. */
export default async function TodayPage({ searchParams }: PageProps<'/today'>) {
  const { done: doneCode } = await searchParams;
  const [t, user, m, locale] = await Promise.all([
    getToday(),
    requireUser(),
    getMessages(),
    getLocale(),
  ]);
  const w = m.today;
  const people = new Set([
    ...t.followUps.filter((f) => f.daysAway <= 0).map((f) => f.contactId),
    ...t.keepInTouch.map((k) => k.contactId),
    ...t.birthdays.filter((b) => b.daysAway === 0).map((b) => b.contactId),
  ]).size;
  const nothing =
    t.followUps.length === 0 &&
    t.keepInTouch.length === 0 &&
    t.birthdays.length === 0;
  const first = spotlight(t, m);
  const name = user.displayName?.trim()
    ? firstName(user.displayName.trim())
    : null;

  return (
    <div className="max-w-xl space-y-6 lg:max-w-none">
      <div className="lg:flex lg:items-end lg:justify-between lg:gap-6">
        <header className="space-y-1">
          <p className="text-xs font-bold tracking-wider text-accent uppercase">
            {formatDay(t.today, locale)}
          </p>
          <h1 className="text-[28px] leading-tight font-semibold">
            {greeting(w)}
            {name ? `, ${name}` : ''}
          </h1>
          <p className="text-muted">
            {people > 0
              ? plural(people, w.toReach)
              : nothing
                ? w.caughtUp
                : w.comingUp}
          </p>
        </header>
        <div className="hidden shrink-0 gap-2.5 lg:flex">
          <Link
            href="/groups"
            className="inline-flex h-11 items-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            {w.textGroup}
          </Link>
          <Link
            href="/contacts/new"
            className="btn-primary inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <PlusIcon className="size-4" />
            {w.newContact}
          </Link>
        </div>
      </div>
      <Notice code={doneCode} />

      {!nothing && (
        <div className="grid grid-cols-3 gap-2.5">
          <Stat
            href="#follow-ups"
            n={t.followUps.length}
            label={w.stats.followUps}
          />
          <Stat
            href="#birthdays"
            n={t.birthdays.length}
            label={w.stats.birthdays}
          />
          <Stat
            href="#keep-in-touch"
            n={t.keepInTouch.length}
            label={w.stats.keepInTouch}
          />
        </div>
      )}

      <div className="space-y-6 lg:grid lg:grid-cols-3 lg:items-start lg:gap-6 lg:space-y-0">
        <div className="space-y-6 lg:col-span-2">
          {first && (
            <div className="space-y-3 rounded-2xl border border-accent/30 bg-gradient-to-br from-emerald-500/15 to-violet-500/10 p-4 shadow-[var(--card-shadow)]">
              <Link
                href={`/contacts/${first.id}`}
                className="flex items-center gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              >
                <Avatar name={first.name} colourKey={first.id} />
                <span className="min-w-0">
                  <span className="block truncate text-lg font-bold">
                    {first.name}
                  </span>
                  <span className="block truncate text-sm font-medium text-accent">
                    {first.line}
                  </span>
                </span>
              </Link>
              {first.phone && (
                <div className="flex gap-2">
                  <a
                    href={`tel:${first.phone.e164 ?? first.phone.raw}`}
                    className="btn-primary inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <PhoneIcon className="size-4" />
                    {m.common.call}
                  </a>
                  {first.phone.e164 && (
                    <a
                      href={whatsappHref(first.phone.e164, first.text)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface text-sm font-semibold hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                    >
                      <WhatsAppIcon className="size-4" />
                      {first.message}
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {nothing && (
            <div className="card flex flex-col items-center gap-2 rounded-3xl px-6 py-7 text-center">
              <svg
                aria-hidden="true"
                width="120"
                height="84"
                viewBox="0 0 120 84"
                fill="none"
              >
                <ellipse
                  cx="60"
                  cy="42"
                  rx="54"
                  ry="16"
                  stroke="#a78bfa"
                  strokeWidth="1.5"
                  strokeDasharray="3 5"
                  transform="rotate(-12 60 42)"
                />
                <circle
                  cx="60"
                  cy="42"
                  r="20"
                  className="fill-accent-soft stroke-accent"
                  strokeWidth="2"
                />
                <path
                  d="M51 42l6 6 12-12"
                  className="stroke-accent"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="10" cy="50" r="4" fill="#a78bfa" />
                <circle cx="108" cy="30" r="5" fill="#34d399" />
                <circle cx="96" cy="60" r="3" fill="#f59e0b" />
              </svg>
              <h2 className="text-xl font-semibold">{w.emptyTitle}</h2>
              <p className="max-w-xs text-sm text-muted">{w.emptyBody}</p>
            </div>
          )}

          {nothing && t.setup && <Checklist setup={t.setup} t={w} />}

          {t.followUps.length > 0 && (
            <Section id="follow-ups" title={w.followUp}>
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
                          f.daysAway < 0
                            ? ' text-red-700 dark:text-red-300'
                            : ''
                        }
                      >
                        {' · '}
                        {f.daysAway < 0
                          ? plural(-f.daysAway, w.late)
                          : relativeDay(f.daysAway, m.remember)}
                      </span>
                    </>
                  }
                >
                  <Reach name={f.displayName} phone={f.phone} c={m.common} />
                  <form action={followUpDone}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="back" value="/today" />
                    <button
                      type="submit"
                      aria-label={fmt(w.doneLabel, { note: f.note })}
                      className={done}
                    >
                      <CheckIcon className="size-[18px]" />
                    </button>
                  </form>
                </Row>
              ))}
            </Section>
          )}

          {t.keepInTouch.length > 0 && (
            <Section id="keep-in-touch" title={w.keepInTouch} hint={w.keepHint}>
              {t.keepInTouch.map((k) => (
                <Row
                  key={k.contactId}
                  id={k.contactId}
                  name={k.displayName}
                  detail={`${cadenceLabel(k.everyDays, m.remember)} · ${
                    k.overdueDays === 0
                      ? w.dueToday
                      : plural(k.overdueDays, w.overdue)
                  }`}
                >
                  <Reach name={k.displayName} phone={k.phone} c={m.common} />
                  <form action={markContacted}>
                    <input type="hidden" name="contactId" value={k.contactId} />
                    <input type="hidden" name="back" value="/today" />
                    <button
                      type="submit"
                      aria-label={fmt(w.inTouchWith, { name: k.displayName })}
                      className={done}
                    >
                      <CheckIcon className="size-[18px]" />
                    </button>
                  </form>
                </Row>
              ))}
            </Section>
          )}

          {t.birthdays.length > 0 && (
            <Section id="birthdays" title={w.birthdays}>
              {t.birthdays.map((b) => (
                <Row
                  key={b.contactId}
                  id={b.contactId}
                  name={b.displayName}
                  detail={
                    <>
                      {b.daysAway === 0 ? (
                        <strong className="text-accent">{w.todayParty}</strong>
                      ) : (
                        `${formatDay(b.on, locale)} · ${relativeDay(b.daysAway, m.remember)}`
                      )}
                      {b.turning > 0 &&
                        b.turning < 130 &&
                        fmt(w.turns, { n: b.turning })}
                    </>
                  }
                >
                  <Reach
                    name={b.displayName}
                    phone={b.phone}
                    text={fmt(w.happyBirthday, {
                      name: firstName(b.displayName),
                    })}
                    c={m.common}
                  />
                </Row>
              ))}
            </Section>
          )}
        </div>
        <aside className="space-y-6">
          <QuickActions t={w} />

          <Link
            href="/account#reminders-heading"
            className="card flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <span className="flex-1 text-muted">{w.reminderPromo}</span>
            <span className="font-semibold text-accent">{w.turnOn}</span>
            <ChevronRightIcon className="size-4 text-accent" />
          </Link>
        </aside>
      </div>
    </div>
  );
}
