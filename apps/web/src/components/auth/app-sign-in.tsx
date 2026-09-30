'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { redeemAppSignIn } from '@/app/actions/auth';
import { useMessages } from '@/i18n/client';

export function AppSignIn() {
  const t = useMessages().appSignIn;
  const router = useRouter();
  const [error, setError] = useState<string>();
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const params = new URLSearchParams(window.location.hash.slice(1));
    // The secret must not linger in the address or the history.
    history.replaceState(null, '', window.location.pathname);
    void redeemAppSignIn(params.get('code') ?? '', params.get('v') ?? '').then(
      (res) => {
        if ('next' in res) router.replace(res.next);
        else setError(res.error);
      },
    );
  }, [router]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-6 text-center">
      {error ? (
        <>
          <p role="alert" className="text-red-700 dark:text-red-300">
            {error}
          </p>
          <a href="/login" className="font-medium text-accent hover:underline">
            {t.again}
          </a>
        </>
      ) : (
        <p className="text-muted" aria-live="polite">
          {t.signingIn}
        </p>
      )}
    </main>
  );
}
