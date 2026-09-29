import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { recoveryKeySaved } from '@/app/actions/auth';
import {
  MakeRecoveryKey,
  RecoveryKeyBox,
} from '@/components/auth/recovery-key';
import { getMessages, pageTitle } from '@/i18n/server';
import { isProduction } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { recoveryKeyCookieName } from '@/lib/session-cookie';

export const generateMetadata = (): Promise<Metadata> =>
  pageTitle('recoveryKey');

/**
 * Right after a password sign-up: the new recovery key, once (ADR 0021).
 * Later (Profile → Recovery key): the password makes a new one.
 */
export default async function RecoveryKeyPage() {
  await requireUser();
  const [jar, m] = await Promise.all([cookies(), getMessages()]);
  const fresh = jar.get(recoveryKeyCookieName(isProduction()))?.value;
  if (fresh) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <header className="space-y-2">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {m.auth.recoveryKeyTitle}
          </h1>
          <p className="text-muted">{m.auth.recoveryKeyLead}</p>
        </header>
        <RecoveryKeyBox value={fresh} />
        <form action={recoveryKeySaved}>
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-lg btn-primary px-4 py-2.5 text-base font-medium"
          >
            {m.auth.recoveryKeySaved}
          </button>
        </form>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-md space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {m.auth.newRecoveryKeyTitle}
        </h1>
        <p className="text-muted">{m.auth.newRecoveryKeyLead}</p>
      </header>
      <MakeRecoveryKey />
    </div>
  );
}
