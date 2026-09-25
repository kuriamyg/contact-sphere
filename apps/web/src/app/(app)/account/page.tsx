import type { Metadata } from 'next';

import { logoutEverywhere } from '@/app/actions/auth';
import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Account · Contact Sphere' };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-muted">
          Signed in as <span className="text-foreground">{user.email}</span>
        </p>
      </header>

      <section
        aria-labelledby="password-heading"
        className="max-w-sm space-y-4"
      >
        <h2 id="password-heading" className="text-lg font-semibold">
          Change password
        </h2>
        <ChangePasswordForm />
      </section>

      <section
        aria-labelledby="sessions-heading"
        className="max-w-sm space-y-3"
      >
        <h2 id="sessions-heading" className="text-lg font-semibold">
          Devices
        </h2>
        <p className="text-sm text-muted">
          Lost a phone, or signed in somewhere you shouldn’t have? Sign out
          every device, including this one.
        </p>
        <form action={logoutEverywhere}>
          <button
            type="submit"
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
          >
            Sign out everywhere
          </button>
        </form>
      </section>
    </div>
  );
}
