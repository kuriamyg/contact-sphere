import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Consent } from '@/components/auth/consent';
import { PhoneCodeForm } from '@/components/auth/phone-code-form';
import { getMessages, pageTitle } from '@/i18n/server';
import { currentUser, signupOpen } from '@/lib/auth';

export const generateMetadata = (): Promise<Metadata> => pageTitle('signUp');

/** Open sign-up with a mobile number and an SMS code (B6, ADR 0018). */
export default async function SignupPage() {
  if (await currentUser().catch(() => null)) redirect('/contacts');
  if (!(await signupOpen())) redirect('/login');
  const m = await getMessages();
  return (
    <>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {m.auth.signUpTitle}
        </h1>
        <p className="text-muted">{m.auth.signUpLead}</p>
      </header>
      <PhoneCodeForm purpose="signup" />
      <Consent />
      <p className="text-sm text-muted">
        {m.auth.haveAccount}{' '}
        <Link href="/login" className="font-medium text-foreground underline">
          {m.auth.signInLink}
        </Link>
      </p>
    </>
  );
}
