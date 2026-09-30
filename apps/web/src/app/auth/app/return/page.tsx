import type { Metadata } from 'next';

import { getMessages } from '@/i18n/server';
import { BASE64URL_43 } from '@/lib/google-oauth';

export const metadata: Metadata = { title: 'Contact Sphere' };
export const dynamic = 'force-dynamic';

/** The Android app's package: only it can receive the code (ADR 0025). */
const APP_PACKAGE = 'com.coderiserdigital.contactsphere';

/**
 * In the phone's browser, after Google: one tap back into the app with the
 * single-use code. A tap, not an automatic jump: Chrome only opens an app
 * from a link the person taps. The code is useless without the secret the
 * app kept, and expires in two minutes.
 */
export default async function BackToAppPage({
  searchParams,
}: PageProps<'/auth/app/return'>) {
  const { code } = await searchParams;
  const t = (await getMessages()).auth;
  const ok = typeof code === 'string' && BASE64URL_43.test(code);
  const href = ok
    ? `intent://signin?code=${code}#Intent;scheme=contactsphere;package=${APP_PACKAGE};end`
    : null;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {href ? t.appReturnTitle : t.appReturnFailed}
      </h1>
      {href && (
        <>
          <p className="text-muted">{t.appReturnBody}</p>
          <a
            href={href}
            className="rounded-lg btn-primary px-4 py-3 font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {t.appReturnButton}
          </a>
        </>
      )}
    </main>
  );
}
