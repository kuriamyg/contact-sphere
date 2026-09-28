import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PhoneCodeForm } from '@/components/auth/phone-code-form';
import { getMessages, pageTitle } from '@/i18n/server';
import { signupOpen } from '@/lib/auth';

export const generateMetadata = (): Promise<Metadata> =>
  pageTitle('resetPassword');

/** Forgot password: a code by SMS to the number on the account (B6). */
export default async function ResetPage() {
  if (!(await signupOpen())) redirect('/login');
  const m = await getMessages();
  return (
    <>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {m.auth.resetTitle}
        </h1>
        <p className="text-muted">{m.auth.resetLead}</p>
      </header>
      <PhoneCodeForm purpose="reset" />
      <p className="text-sm text-muted">
        <Link href="/login" className="font-medium text-foreground underline">
          {m.auth.signInLink}
        </Link>
      </p>
    </>
  );
}
