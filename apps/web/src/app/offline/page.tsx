import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Offline · Contact Sphere' };

/**
 * Shown by the service worker when there is no connection. Works without
 * JavaScript: it is cached as plain HTML.
 */
export default function OfflinePage() {
  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-14 items-center justify-center rounded-2xl bg-accent text-lg font-bold text-background"
      >
        CS
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">
        You&rsquo;re offline
      </h1>
      <p className="text-muted">
        Contact Sphere needs a connection to show your contacts. Nothing is lost
        — check your data or Wi-Fi and try again.
      </p>
      <a
        href="/today"
        className="rounded-lg bg-foreground px-5 py-2.5 font-medium text-background hover:opacity-90"
      >
        Try again
      </a>
    </main>
  );
}
