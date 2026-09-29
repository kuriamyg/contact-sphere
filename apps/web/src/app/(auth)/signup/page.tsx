import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Consent } from '@/components/auth/consent';
import { PhoneCodeForm } from '@/components/auth/phone-code-form';
import { WipeOnSubmit } from '@/components/offline/offline-toggle';
import { getMessages, pageTitle } from '@/i18n/server';
import { logoutToSignup } from '@/app/actions/auth';
import { fmt } from '@/i18n/format';
import { currentUser, signupOpen, whoIs } from '@/lib/auth';

export const generateMetadata = (): Promise<Metadata> => pageTitle('signUp');

/** Open sign-up with a mobile number and an SMS code (B6, ADR 0018). */
export default async function SignupPage() {
  if (!(await signupOpen())) redirect('/login');
  const [user, m] = await Promise.all([
    currentUser().catch(() => null),
    getMessages(),
  ]);
  // Already signed in: the usual pattern — who, continue, or switch.
  if (user) {
    const name = whoIs(user);
    return (
      <>
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {m.auth.alreadySignedInTitle}
          </h1>
          <p className="text-muted">{fmt(m.auth.alreadySignedIn, { name })}</p>
        </header>
        <Link
          href="/today"
          className="inline-flex w-full items-center justify-center rounded-lg btn-primary px-4 py-2.5 text-base font-medium"
        >
          {m.auth.continueToApp}
        </Link>
        <WipeOnSubmit>
          <form action={logoutToSignup} className="text-center text-sm">
            <span className="text-muted">{fmt(m.auth.notYou, { name })} </span>
            <button type="submit" className="font-medium underline">
              {m.auth.signOut}
            </button>
          </form>
        </WipeOnSubmit>
      </>
    );
  }
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
