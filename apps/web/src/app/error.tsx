'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useEffect } from 'react';

import { useMessages } from '@/i18n/client';

/**
 * Shown when a page cannot be built — in practice, when the API cannot be
 * reached (Render's free instance waking up, a network blip). Says plainly
 * that nothing was lost and offers a retry, instead of the framework's
 * generic "This page couldn't load".
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const t = useMessages().error;
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-16"
    >
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      <p className="text-muted">{t.body}</p>
      <button
        type="button"
        // Refetch the server-rendered page, not just re-render the client.
        onClick={() =>
          startTransition(() => {
            router.refresh();
            reset();
          })
        }
        className="rounded-lg btn-primary px-4 py-2.5 font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        {t.retry}
      </button>
    </main>
  );
}
