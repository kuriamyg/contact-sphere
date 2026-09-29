import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Consent } from '@/components/auth/consent';
import { PhoneCodeForm } from '@/components/auth/phone-code-form';
import { WipeOnSubmit } from '@/components/offline/offline-toggle';
import { getMessages, pageTitle } from '@/i18n/server';
import { logout } from '@/app/actions/auth';
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
  // Signed in already: say so instead of silently leaving the page.
  if (user) {
    return (
      <>
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {m.auth.signUpTitle}
          </h1>
          <p>{fmt(m.auth.alreadySignedIn, { name: whoIs(user) })}</p>
          <p className="text-muted">{m.auth.signOutToCreate}</p>
        </header>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/contacts"
            className="inline-flex items-center rounded-lg btn-primary px-4 py-2.5 font-medium"
          >
            {m.auth.goToContacts}
          </Link>
          <WipeOnSubmit>
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex items-center rounded-lg border border-border px-4 py-2.5 font-medium"
              >
                {m.auth.signOut}
              </button>
            </form>
          </WipeOnSubmit>
        </div>
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
