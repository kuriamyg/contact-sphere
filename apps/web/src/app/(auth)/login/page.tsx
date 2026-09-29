import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/auth/login-form';
import { WipeAll } from '@/components/offline/offline-sync';
import { getMessages, pageTitle } from '@/i18n/server';
import { GoogleButton, OrDivider } from '@/components/auth/google-button';
import { FormMessage } from '@/components/auth/field';
import { currentUser, setupAvailable, signupStatus } from '@/lib/auth';

export const generateMetadata = (): Promise<Metadata> => pageTitle('signIn');

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; reset?: string; google?: string }>;
}) {
  const query = await searchParams;
  const deleted = query.deleted === '1';
  const reset = query.reset === '1';
  // If the API is unreachable, still show the form: signing in will then
  // say the service is unavailable, which is more useful than an error page.
  if (await currentUser().catch(() => null)) redirect('/contacts');
  const [canSetUp, status, m] = await Promise.all([
    setupAvailable(),
    signupStatus(),
    getMessages(),
  ]);
  const googleProblem =
    query.google && query.google in m.auth.google
      ? m.auth.google[query.google as keyof typeof m.auth.google]
      : undefined;
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
      {reset && (
        <p
          role="status"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          {m.auth.passwordReset}
        </p>
      )}
      <FormMessage error={googleProblem} />
      {status.googleClientId && (
        <>
          <GoogleButton label={m.auth.continueWithGoogle} />
          <OrDivider label={m.auth.or} />
        </>
      )}
      <LoginForm />
      <div className="space-y-2 text-sm text-muted">
        {/* The recovery key works on any account that has one (ADR 0021). */}
        <p>
          <Link href="/reset" className="underline">
            {m.auth.forgot}
          </Link>
        </p>
        {status.open && (
          <p>
            {m.auth.newHere}{' '}
            <Link
              href="/signup"
              className="font-medium text-foreground underline"
            >
              {m.auth.createAccount}
            </Link>
          </p>
        )}
      </div>
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
