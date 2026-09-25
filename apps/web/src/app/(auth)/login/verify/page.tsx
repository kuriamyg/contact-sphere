import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { MfaForm } from '@/components/auth/mfa-form';
import { isProduction } from '@/lib/api';
import { mfaCookieName } from '@/lib/session-cookie';

export const metadata: Metadata = { title: 'Verify · Contact Sphere' };

/** The second sign-in step (ADR 0013). */
export default async function VerifyPage() {
  if (!(await cookies()).get(mfaCookieName(isProduction()))) {
    redirect('/login');
  }
  return (
    <>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Two-factor verification
        </h1>
        <p className="text-muted">
          Open your authenticator app and enter the current code.
        </p>
      </header>
      <MfaForm />
      <p className="text-sm text-muted">
        <Link href="/login" className="underline">
          Start again
        </Link>
      </p>
    </>
  );
}
