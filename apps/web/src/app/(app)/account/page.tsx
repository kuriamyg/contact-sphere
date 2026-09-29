import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';

import { logout, logoutEverywhere, signOutDevice } from '@/app/actions/auth';
import { DeleteAccountForm } from '@/components/account/delete-account-form';
import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { TwoFactorSection } from '@/components/auth/two-factor-section';
import { Avatar } from '@/components/avatar';
import {
  BellIcon,
  CheckIcon,
  DownloadIcon,
  GlobeIcon,
  LogOutIcon,
  QrIcon,
  ShieldIcon,
  SunIcon,
  TrashIcon,
  UploadIcon,
  UserIcon,
} from '@/components/icons';
import { NameForm } from '@/components/profile/name-form';
import { InstallApp } from '@/components/pwa/install-app';
import { LanguageSwitch } from '@/components/shell/language-switch';
import { ThemeSwitch } from '@/components/shell/theme-switch';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';
import { EmailReminders } from '@/components/reach/email-reminders';
import { PhoneReminders } from '@/components/reach/phone-reminders';
import {
  OfflineToggle,
  WipeOnSubmit,
} from '@/components/offline/offline-toggle';
import { getDevices, requireUser, whoIs } from '@/lib/auth';
import { getContactStats } from '@/lib/contacts';
import { formatDate, formatDateTime } from '@/lib/format';
import { getReachStatus } from '@/lib/reach';
import { getBilling } from '@/lib/billing';
import { PlanSection } from '@/components/billing/plan-section';
import { fmt } from '@/i18n/format';
import { getLocale, getMessages, pageTitle } from '@/i18n/server';

export const generateMetadata = (): Promise<Metadata> => pageTitle('profile');

/** Sections are flat blocks on the page, divided by hairlines, not cards. */
const card = 'border-t border-border py-7 first:border-t-0 first:pt-2';
const button =
  'inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium bg-surface hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none';

function CardTitle({
  id,
  icon,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  children: string;
}) {
  return (
    <h2
      id={id}
      className="flex scroll-mt-24 items-center gap-2 text-lg font-semibold"
    >
      <span className="text-accent">{icon}</span>
      {children}
    </h2>
  );
}

/** "Chrome on Android" → "Chrome kwenye Android" in Kiswahili. */
function deviceName(device: string | null, locale: string): string | null {
  if (!device) return null;
  return locale === 'sw' ? device.replace(' on ', ' kwenye ') : device;
}

/**
 * Everything about the account in one ordered place: who you are, your
 * name, security, your data, and signing out.
 */
export default async function ProfilePage() {
  const user = await requireUser();
  const [stats, reach, m, locale, devices, billing] = await Promise.all([
    getContactStats(),
    getReachStatus(),
    getMessages(),
    getLocale(),
    getDevices(),
    getBilling(),
  ]);
  const t = m.account;
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const name = whoIs(user);

  return (
    <div className="-mx-4 -mt-6 sm:mx-0 sm:mt-0 lg:max-w-6xl">
      <h1 className="sr-only">{t.title}</h1>

      <section
        aria-label={t.yourProfile}
        className="flex flex-col items-center gap-5 border-b border-border bg-gradient-to-br from-emerald-500/15 via-transparent to-violet-500/15 px-4 py-8 text-center sm:rounded-3xl sm:border lg:flex-row lg:gap-7 lg:px-8 lg:text-left"
      >
        <Avatar name={name} colourKey={user.id} size="xl" ring />
        <div className="min-w-0 space-y-1.5 lg:flex-1">
          <p className="font-display text-2xl font-semibold tracking-tight break-words lg:text-3xl">
            {user.displayName ?? t.welcome}
          </p>
          <p className="break-all text-muted">
            {user.email ?? user.phone}
            {/* Absent only while an older API is still deploying. */}
            {user.createdAt && (
              <span className="block text-sm lg:inline">
                <span className="hidden lg:inline"> · </span>
                {fmt(t.memberSince, {
                  date: formatDate(user.createdAt, locale),
                })}
              </span>
            )}
          </p>
          <p
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
              user.totpEnabled
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                : 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100'
            }`}
          >
            <ShieldIcon className="size-4" />
            {user.totpEnabled ? t.twoFactorOn : t.twoFactorOff}
          </p>
        </div>
        {stats && (
          <ul
            aria-label={t.yourContacts}
            className="grid w-full max-w-sm grid-cols-3 divide-x divide-border rounded-2xl card lg:w-auto lg:min-w-80"
          >
            {(
              [
                [t.stats.contacts, stats.active, '/contacts'],
                [t.stats.archived, stats.archived, '/contacts?view=archived'],
                [t.stats.trash, stats.trash, '/contacts?view=trash'],
              ] as const
            ).map(([label, n, href]) => (
              <li key={label}>
                <Link
                  href={href}
                  className="flex flex-col items-center rounded-2xl px-4 py-3 hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none"
                >
                  <span className="font-display text-xl font-semibold tabular-nums">
                    {n}
                  </span>
                  <span className="text-sm text-muted">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="px-4 pt-4 sm:px-0 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12 lg:pt-8">
        <nav
          aria-label={t.settingsNav}
          className="sticky top-10 hidden self-start lg:block"
        >
          <ul className="space-y-0.5">
            {(
              [
                ['details-heading', t.personal],
                ['plan-heading', m.billing.planTitle],
                ['security-heading', t.security],
                ['install-heading', t.installTitle],
                ['reminders-heading', t.remindersTitle],
                ['card-heading', t.cardTitle],
                ['language-heading', t.languageTitle],
                ['appearance-heading', m.client.shell.appearance],
                ['offline-heading', t.offlineTitle],
                ['data-heading', t.dataTitle],
                ['legal-heading', t.legalTitle],
                ['sessions-heading', t.signOutTitle],
                ['delete-heading', t.deleteTitle],
              ] as const
            ).map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-muted hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="max-w-2xl">
          <section
            aria-labelledby="details-heading"
            className={`${card} space-y-4`}
          >
            <CardTitle id="details-heading" icon={<UserIcon />}>
              {t.personal}
            </CardTitle>
            <NameForm current={user.displayName ?? null} />
            {user.email && (
              <div className="space-y-1">
                <p className="text-sm font-medium">{t.email}</p>
                <p className="break-all text-muted">{user.email}</p>
              </div>
            )}
            {user.phone && (
              <div className="space-y-1">
                <p className="text-sm font-medium">{t.phone}</p>
                <p className="text-muted">
                  {user.phone}
                  {user.phoneVerified === false && ` · ${t.phoneNotVerified}`}
                </p>
              </div>
            )}
            {user.google && (
              <div className="space-y-1">
                <p className="text-sm font-medium">{t.signInMethod}</p>
                <p className="break-all text-muted">
                  {fmt(t.withGoogle, { email: user.email ?? '' })}
                </p>
              </div>
            )}
          </section>

          {billing && (
            <section
              aria-labelledby="plan-heading"
              className={`${card} space-y-4`}
            >
              <CardTitle id="plan-heading" icon={<CheckIcon />}>
                {m.billing.planTitle}
              </CardTitle>
              <PlanSection
                billing={billing}
                phone={user.phone ?? null}
                locale={locale}
              />
            </section>
          )}

          <section
            aria-labelledby="security-heading"
            className={`${card} space-y-5`}
          >
            <CardTitle id="security-heading" icon={<ShieldIcon />}>
              {t.security}
            </CardTitle>
            <div className="space-y-3">
              <h3 className="font-medium">{t.twoFactor}</h3>
              <TwoFactorSection
                enabled={user.totpEnabled}
                recoveryCodesLeft={user.recoveryCodesLeft}
                hasPassword={user.hasPassword !== false}
              />
            </div>
            {/* Google-only accounts have no password to change (ADR 0020). */}
            {user.hasPassword !== false && (
              <details className="border-t border-border pt-4">
                <summary className="cursor-pointer font-medium">
                  {t.changePassword}
                </summary>
                <div className="mt-4">
                  <ChangePasswordForm />
                </div>
              </details>
            )}
            {/* Resets a forgotten password without SMS (ADR 0021). */}
            {user.hasPassword !== false && (
              <div className="space-y-1 border-t border-border pt-4">
                <Link href="/recovery-key" className="font-medium underline">
                  {t.recoveryKey}
                </Link>
                <p className="text-sm text-muted">
                  {user.hasRecoveryKey ? t.recoveryKeyHas : t.recoveryKeyNone}
                </p>
              </div>
            )}
          </section>

          <section
            aria-labelledby="install-heading"
            className={`${card} space-y-3`}
          >
            <CardTitle id="install-heading" icon={<DownloadIcon />}>
              {t.installTitle}
            </CardTitle>
            <p className="text-sm text-muted">{t.installBody}</p>
            <InstallApp />
          </section>

          <section
            aria-labelledby="reminders-heading"
            className={`${card} space-y-3`}
          >
            <CardTitle id="reminders-heading" icon={<BellIcon />}>
              {t.remindersTitle}
            </CardTitle>
            <p className="text-sm text-muted">{t.remindersBody}</p>
            {reach?.push.enabled && reach.push.publicKey ? (
              <PhoneReminders publicKey={reach.push.publicKey} />
            ) : (
              <p className="text-sm text-muted">{t.notAvailable}</p>
            )}
            {reach?.email?.enabled && user.email ? (
              <EmailReminders initialOn={reach.email.on} email={user.email} />
            ) : reach?.email?.enabled ? (
              <p className="border-t border-border pt-3 text-sm text-muted">
                {t.emailNeedsAddress}
              </p>
            ) : (
              <p className="border-t border-border pt-3 text-sm text-muted">
                {m.client.reminders.emailNotYet}
              </p>
            )}
          </section>

          <section
            aria-labelledby="card-heading"
            className={`${card} space-y-3`}
          >
            <CardTitle id="card-heading" icon={<QrIcon />}>
              {t.cardTitle}
            </CardTitle>
            <p className="text-sm text-muted">{t.cardBody}</p>
            <Link href="/card" className={button}>
              <QrIcon className="size-4" />
              {t.showCard}
            </Link>
          </section>

          <section
            aria-labelledby="language-heading"
            className={`${card} space-y-3`}
          >
            <CardTitle id="language-heading" icon={<GlobeIcon />}>
              {t.languageTitle}
            </CardTitle>
            <p className="text-sm text-muted">{t.languageBody}</p>
            <LanguageSwitch />
          </section>

          <section
            aria-labelledby="appearance-heading"
            className={`${card} space-y-3`}
          >
            <CardTitle id="appearance-heading" icon={<SunIcon />}>
              {m.client.shell.appearance}
            </CardTitle>
            <ThemeSwitch initial={theme} />
          </section>

          <section
            aria-labelledby="offline-heading"
            className={`${card} space-y-3`}
          >
            <CardTitle id="offline-heading" icon={<DownloadIcon />}>
              {t.offlineTitle}
            </CardTitle>
            <p className="text-sm text-muted">{t.offlineBody}</p>
            <OfflineToggle />
          </section>

          <section
            aria-labelledby="data-heading"
            className={`${card} space-y-4`}
          >
            <CardTitle id="data-heading" icon={<DownloadIcon />}>
              {t.dataTitle}
            </CardTitle>
            <p className="text-sm text-muted">{t.dataBody}</p>
            <div className="flex flex-wrap gap-3">
              <a href="/contacts/export" download className={button}>
                <DownloadIcon className="size-4" />
                {t.exportVcf}
              </a>
              <Link href="/contacts/import" className={button}>
                <UploadIcon className="size-4" />
                {t.importContacts}
              </Link>
            </div>
          </section>

          <section
            aria-labelledby="legal-heading"
            className={`${card} space-y-3`}
          >
            <CardTitle id="legal-heading" icon={<ShieldIcon />}>
              {t.legalTitle}
            </CardTitle>
            <p className="text-sm text-muted">{t.legalBody}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/privacy" className={button}>
                {t.privacy}
              </Link>
              <Link href="/terms" className={button}>
                {t.terms}
              </Link>
            </div>
          </section>

          <section
            aria-labelledby="sessions-heading"
            className={`${card} space-y-4`}
          >
            <CardTitle id="sessions-heading" icon={<LogOutIcon />}>
              {t.signOutTitle}
            </CardTitle>
            <p className="text-sm text-muted">{t.devicesBody}</p>
            {devices ? (
              <ul
                aria-label={t.signOutTitle}
                className="divide-y divide-border rounded-2xl border border-border bg-surface"
              >
                {devices.map((d) => {
                  const label = deviceName(d.device, locale) ?? t.someBrowser;
                  return (
                    <li
                      key={d.id}
                      className="flex flex-wrap items-center gap-3 px-4 py-3"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                          {label}
                          {d.current && (
                            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">
                              {t.thisDevice}
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-muted">
                          {fmt(t.deviceActive, {
                            date: formatDateTime(d.lastSeenAt, locale),
                          })}
                          {' · '}
                          {fmt(t.deviceSince, {
                            date: formatDate(d.createdAt, locale),
                          })}
                        </span>
                      </span>
                      {!d.current && (
                        <form action={signOutDevice}>
                          <input type="hidden" name="sessionId" value={d.id} />
                          <button
                            type="submit"
                            aria-label={fmt(t.signOutDeviceLabel, {
                              device: label,
                            })}
                            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                          >
                            {t.signOutDevice}
                          </button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted" role="status">
                {t.devicesFailed}
              </p>
            )}
            <WipeOnSubmit>
              <form action={logout}>
                <button
                  type="submit"
                  className={`${button} w-full justify-center`}
                >
                  <LogOutIcon className="size-4" />
                  {t.signOutHere}
                </button>
              </form>
            </WipeOnSubmit>
            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-sm text-muted">{t.signOutAllBody}</p>
              <WipeOnSubmit>
                <form action={logoutEverywhere}>
                  <button
                    type="submit"
                    className="w-full rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                  >
                    {t.signOutAll}
                  </button>
                </form>
              </WipeOnSubmit>
            </div>
          </section>

          <section
            aria-labelledby="delete-heading"
            className={`${card} space-y-4`}
          >
            <CardTitle id="delete-heading" icon={<TrashIcon />}>
              {t.deleteTitle}
            </CardTitle>
            <p className="max-w-prose text-sm text-muted">{t.deleteBody}</p>
            <a
              href="/contacts/export"
              download
              className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
            >
              <DownloadIcon className="size-4" />
              {t.deleteExport}
            </a>
            <DeleteAccountForm
              twoFactor={user.totpEnabled}
              hasPassword={user.hasPassword !== false}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
