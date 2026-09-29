import type { Metadata } from 'next';
import Link from 'next/link';

import { PhoneCodeForm } from '@/components/auth/phone-code-form';
import { RecoverForm } from '@/components/auth/recovery-key';
import { getMessages, pageTitle } from '@/i18n/server';
import { signupStatus } from '@/lib/auth';

export const generateMetadata = (): Promise<Metadata> =>
  pageTitle('resetPassword');

/**
 * Forgot password: the recovery key saved at sign-up (ADR 0021), or — where
 * SMS codes are on — a code to the number on the account (B6).
 */
export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ sms?: string }>;
}) {
  const [{ sms }, status, m] = await Promise.all([
    searchParams,
    signupStatus(),
    getMessages(),
  ]);
  const bySms = status.sms && sms === '1';
  return (
    <>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {m.auth.resetTitle}
        </h1>
        <p className="text-muted">
          {bySms ? m.auth.resetLead : m.auth.resetLeadKey}
        </p>
      </header>
      {bySms ? <PhoneCodeForm purpose="reset" /> : <RecoverForm />}
      <div className="space-y-2 text-sm text-muted">
        {status.sms && !bySms && (
          <p>
            <Link href="/reset?sms=1" className="underline">
              {m.auth.resetWithSms}
            </Link>
          </p>
        )}
        <p>
          <Link href="/login" className="font-medium text-foreground underline">
            {m.auth.signInLink}
          </Link>
        </p>
      </div>
    </>
  );
}
