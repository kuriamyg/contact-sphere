import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/auth/login-form';
import { WipeAll } from '@/components/offline/offline-sync';
import { getMessages, pageTitle } from '@/i18n/server';
import { currentUser, setupAvailable } from '@/lib/auth';

export const generateMetadata = (): Promise<Metadata> => pageTitle('signIn');

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const deleted = (await searchParams).deleted === '1';
  // If the API is unreachable, still show the form: signing in will then
  // say the service is unavailable, which is more useful than an error page.
  if (await currentUser().catch(() => null)) redirect('/contacts');
  const [canSetUp, m] = await Promise.all([setupAvailable(), getMessages()]);
  return (
    <>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {m.auth.signInTitle}
        </h1>
        <p className="text-muted">{m.auth.signInLead}</p>
      </header>
      {deleted && (
        <p
          role="status"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          {m.auth.accountDeleted}
          <WipeAll />
        </p>
      )}
      <LoginForm />
      {canSetUp && (
        <p className="text-sm text-muted">
          {m.auth.firstTime}{' '}
          <Link href="/setup" className="font-medium text-foreground underline">
            {m.auth.createOwner}
          </Link>
        </p>
      )}
    </>
  );
}
