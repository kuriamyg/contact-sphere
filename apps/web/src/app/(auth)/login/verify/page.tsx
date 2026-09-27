import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { MfaForm } from '@/components/auth/mfa-form';
import { getMessages, pageTitle } from '@/i18n/server';
import { isProduction } from '@/lib/api';
import { mfaCookieName } from '@/lib/session-cookie';

export const generateMetadata = (): Promise<Metadata> => pageTitle('verify');

/** The second sign-in step (ADR 0013). */
export default async function VerifyPage() {
  if (!(await cookies()).get(mfaCookieName(isProduction()))) {
    redirect('/login');
  }
  const m = await getMessages();
  return (
    <>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {m.auth.verifyTitle}
        </h1>
        <p className="text-muted">{m.auth.verifyLead}</p>
      </header>
      <MfaForm />
      <p className="text-sm text-muted">
        <Link href="/login" className="underline">
          {m.auth.startAgain}
        </Link>
      </p>
    </>
  );
}
