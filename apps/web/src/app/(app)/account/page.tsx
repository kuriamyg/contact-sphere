import type { Metadata } from 'next';
import Link from 'next/link';

import { logout, logoutEverywhere } from '@/app/actions/auth';
import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { TwoFactorSection } from '@/components/auth/two-factor-section';
import { Avatar } from '@/components/avatar';
import {
  DownloadIcon,
  LogOutIcon,
  ShieldIcon,
  UploadIcon,
  UserIcon,
} from '@/components/icons';
import { NameForm } from '@/components/profile/name-form';
import { InstallApp } from '@/components/pwa/install-app';
import {
  OfflineToggle,
  WipeOnSubmit,
} from '@/components/offline/offline-toggle';
import { requireUser } from '@/lib/auth';
import { getContactStats } from '@/lib/contacts';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Profile · Contact Sphere' };

const card = 'rounded-2xl border border-border p-5 sm:p-6';
const button =
  'inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none';

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
  const stats = await getContactStats();
  const name = user.displayName ?? user.email;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="sr-only">Profile</h1>

      <section
        aria-label="Your profile"
        className={`${card} flex flex-col items-center gap-4 bg-gradient-to-b from-accent-soft to-transparent text-center`}
      >
        <Avatar name={name} colourKey={user.id} size="xl" ring />
        <div className="space-y-1">
          <p className="text-2xl font-semibold tracking-tight break-words">
            {user.displayName ?? 'Welcome'}
          </p>
          <p className="break-all text-muted">{user.email}</p>
          {/* Absent only while an older API is still deploying. */}
          {user.createdAt && (
            <p className="text-sm text-muted">
              Member since {formatDate(user.createdAt)}
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
          {user.totpEnabled
            ? 'Two-factor sign-in is on'
            : 'Two-factor sign-in is off'}
        </p>
        {stats && (
          <ul
            aria-label="Your contacts"
            className="grid w-full grid-cols-3 divide-x divide-border rounded-xl border border-border bg-background"
          >
            {(
              [
                ['Contacts', stats.active, '/contacts'],
                ['Archived', stats.archived, '/contacts?view=archived'],
                ['Trash', stats.trash, '/contacts?view=trash'],
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
          Personal details
        </CardTitle>
        <NameForm current={user.displayName ?? null} />
        <div className="space-y-1">
          <p className="text-sm font-medium">Email</p>
          <p className="break-all text-muted">{user.email}</p>
        </div>
      </section>

      <section
        aria-labelledby="security-heading"
        className={`${card} space-y-5`}
      >
        <CardTitle id="security-heading" icon={<ShieldIcon />}>
          Security
        </CardTitle>
        <div className="space-y-3">
          <h3 className="font-medium">Two-factor sign-in</h3>
          <TwoFactorSection
            enabled={user.totpEnabled}
            recoveryCodesLeft={user.recoveryCodesLeft}
          />
        </div>
        <details className="border-t border-border pt-4">
          <summary className="cursor-pointer font-medium">
            Change password
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
          Use it like an app
        </CardTitle>
        <p className="text-sm text-muted">
          Put Contact Sphere on your home screen: it opens full screen, straight
          into Today, like any other app.
        </p>
        <InstallApp />
      </section>

      <section
        aria-labelledby="offline-heading"
        className={`${card} space-y-3`}
      >
        <CardTitle id="offline-heading" icon={<DownloadIcon />}>
          Use it without data
        </CardTitle>
        <p className="text-sm text-muted">
          Keep a copy of your contacts, groups and Today on this phone. With no
          data bundle you can still search, open a contact, and call or SMS
          (that uses airtime, like your phone book). Adding or changing things
          and WhatsApp still need data. Signing out deletes the copy.
        </p>
        <OfflineToggle />
      </section>

      <section aria-labelledby="data-heading" className={`${card} space-y-4`}>
        <CardTitle id="data-heading" icon={<DownloadIcon />}>
          Your data
        </CardTitle>
        <p className="text-sm text-muted">
          Your contacts are yours: never sold, shared or used for advertising.
          Take a copy any time.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="/contacts/export" download className={button}>
            <DownloadIcon className="size-4" />
            Export contacts (.vcf)
          </a>
          <Link href="/contacts/import" className={button}>
            <UploadIcon className="size-4" />
            Import contacts
          </Link>
        </div>
      </section>

      <section
        aria-labelledby="sessions-heading"
        className={`${card} space-y-4`}
      >
        <CardTitle id="sessions-heading" icon={<LogOutIcon />}>
          Sign out
        </CardTitle>
        <WipeOnSubmit>
          <form action={logout}>
            <button type="submit" className={`${button} w-full justify-center`}>
              <LogOutIcon className="size-4" />
              Sign out of this device
            </button>
          </form>
        </WipeOnSubmit>
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-sm text-muted">
            Lost a phone, or signed in somewhere you shouldn’t have? This signs
            out every device, including this one.
          </p>
          <WipeOnSubmit>
            <form action={logoutEverywhere}>
              <button
                type="submit"
                className="w-full rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
              >
                Sign out everywhere
              </button>
            </form>
          </WipeOnSubmit>
        </div>
      </section>
    </div>
  );
}
