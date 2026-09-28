import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SetupForm } from '@/components/auth/setup-form';
import { getMessages, pageTitle } from '@/i18n/server';
import { setupAvailable } from '@/lib/auth';

export const generateMetadata = (): Promise<Metadata> => pageTitle('setUp');

/** Exists only until the first account is created (ADR 0004, 0006). */
export default async function SetupPage() {
  if (!(await setupAvailable())) redirect('/login');
  const m = await getMessages();
  return (
    <>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {m.auth.setupTitle}
        </h1>
        <p className="text-muted">{m.auth.setupLead}</p>
      </header>
      <SetupForm />
      <p className="text-center text-xs text-muted">
        {m.auth.agree.split(/(\{terms\}|\{privacy\})/).map((part, i) =>
          part === '{terms}' ? (
            <Link key={i} href="/terms" className="underline">
              {m.auth.termsLink}
            </Link>
          ) : part === '{privacy}' ? (
            <Link key={i} href="/privacy" className="underline">
              {m.auth.privacyLink}
            </Link>
          ) : (
            part
          ),
        )}
      </p>
    </>
  );
}
