import type { Metadata } from 'next';
import Link from 'next/link';

import { logout, logoutEverywhere } from '@/app/actions/auth';
import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { TwoFactorSection } from '@/components/auth/two-factor-section';
import { Avatar } from '@/components/avatar';
import {
  BellIcon,
  DownloadIcon,
  GlobeIcon,
  LogOutIcon,
  QrIcon,
  ShieldIcon,
  UploadIcon,
  UserIcon,
} from '@/components/icons';
import { NameForm } from '@/components/profile/name-form';
import { InstallApp } from '@/components/pwa/install-app';
import { LanguageSwitch } from '@/components/shell/language-switch';
import { EmailReminders } from '@/components/reach/email-reminders';
import { PhoneReminders } from '@/components/reach/phone-reminders';
import {
  OfflineToggle,
  WipeOnSubmit,
} from '@/components/offline/offline-toggle';
import { requireUser } from '@/lib/auth';
import { getContactStats } from '@/lib/contacts';
import { formatDate } from '@/lib/format';
import { getReachStatus } from '@/lib/reach';
import { fmt } from '@/i18n/format';
import { getLocale, getMessages, pageTitle } from '@/i18n/server';

export const generateMetadata = (): Promise<Metadata> => pageTitle('profile');

const card = 'rounded-2xl card p-5 sm:p-6';
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
    <h2 id={id} className="flex items-center gap-2 text-lg font-semibold">
      <span className="text-accent">{icon}</span>
      {children}
    </h2>
  );
}

/**
 * Everything about the account in one ordered place: who you are, your
 * name, security, your data, and signing out.
 */
export default async function ProfilePage() {
  const user = await requireUser();
  const [stats, reach, m, locale] = await Promise.all([
    getContactStats(),
    getReachStatus(),
    getMessages(),
    getLocale(),
  ]);
  const t = m.account;
  const name = user.displayName ?? user.email;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="sr-only">{t.title}</h1>

      <section
        aria-label={t.yourProfile}
        className={`${card} flex flex-col items-center gap-4 bg-gradient-to-b from-accent-soft to-transparent text-center`}
      >
        <Avatar name={name} colourKey={user.id} size="xl" ring />
        <div className="space-y-1">
          <p className="text-2xl font-semibold tracking-tight break-words">
            {user.displayName ?? t.welcome}
          </p>
          <p className="break-all text-muted">{user.email}</p>
          {/* Absent only while an older API is still deploying. */}
          {user.createdAt && (
            <p className="text-sm text-muted">
              {fmt(t.memberSince, {
                date: formatDate(user.createdAt, locale),
              })}
            </p>
          )}
        </div>
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
        {stats && (
          <ul
            aria-label={t.yourContacts}
            className="grid w-full grid-cols-3 divide-x divide-border rounded-xl card bg-background"
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
                  className="flex flex-col items-center rounded-xl py-3 hover:bg-surface focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none"
                >
                  <span className="text-xl font-semibold tabular-nums">
                    {n}
                  </span>
                  <span className="text-sm text-muted">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="details-heading"
        className={`${card} space-y-4`}
      >
        <CardTitle id="details-heading" icon={<UserIcon />}>
          {t.personal}
        </CardTitle>
        <NameForm current={user.displayName ?? null} />
        <div className="space-y-1">
          <p className="text-sm font-medium">{t.email}</p>
          <p className="break-all text-muted">{user.email}</p>
        </div>
      </section>

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
          />
        </div>
        <details className="border-t border-border pt-4">
          <summary className="cursor-pointer font-medium">
            {t.changePassword}
          </summary>
          <div className="mt-4">
            <ChangePasswordForm />
          </div>
        </details>
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
        {reach?.email?.enabled ? (
          <EmailReminders initialOn={reach.email.on} email={user.email} />
        ) : (
          <p className="border-t border-border pt-3 text-sm text-muted">
            {m.client.reminders.emailNotYet}
          </p>
        )}
      </section>

      <section aria-labelledby="card-heading" className={`${card} space-y-3`}>
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
        aria-labelledby="offline-heading"
        className={`${card} space-y-3`}
      >
        <CardTitle id="offline-heading" icon={<DownloadIcon />}>
          {t.offlineTitle}
        </CardTitle>
        <p className="text-sm text-muted">{t.offlineBody}</p>
        <OfflineToggle />
      </section>

      <section aria-labelledby="data-heading" className={`${card} space-y-4`}>
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
        aria-labelledby="sessions-heading"
        className={`${card} space-y-4`}
      >
        <CardTitle id="sessions-heading" icon={<LogOutIcon />}>
          {t.signOutTitle}
        </CardTitle>
        <WipeOnSubmit>
          <form action={logout}>
            <button type="submit" className={`${button} w-full justify-center`}>
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
    </div>
  );
}
