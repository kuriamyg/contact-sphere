'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useEffect } from 'react';

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
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-16"
    >
      <h1 className="text-2xl font-semibold tracking-tight">
        Can’t reach Contact Sphere right now
      </h1>
      <p className="text-muted">
        The service may be starting up (up to a minute) or busy. Nothing was
        changed — try again in a moment.
      </p>
      <button
        type="button"
        // Refetch the server-rendered page, not just re-render the client.
        onClick={() =>
          startTransition(() => {
            router.refresh();
            reset();
          })
        }
        className="rounded-lg bg-foreground px-4 py-2.5 font-medium text-background focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none"
      >
        Try again
      </button>
    </main>
  );
}
