import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { ApiStatusBadge } from '@/components/api-status-badge';
import { checkApiHealth } from '@/lib/api-health';

async function ApiStatus() {
  // Checked per request, never baked in at build time.
  await connection();
  const status = await checkApiHealth(process.env.API_URL);
  return <ApiStatusBadge status={status} />;
}

export default function Home() {
  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-10 px-4 py-16 sm:px-6"
    >
      <header className="space-y-3">
        <p className="text-sm font-medium tracking-wide text-muted uppercase">
          Private · Contacts
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Contact Sphere
        </h1>
        <p className="max-w-prose text-lg text-muted">
          A privacy-first home for your contacts, groups and relationships. Your
          data is never sold or used for advertising.
        </p>
      </header>

      <Link
        href="/login"
        className="self-start rounded-lg bg-foreground px-5 py-2.5 font-medium text-background hover:opacity-90 focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Sign in
      </Link>

      <section
        aria-labelledby="status-heading"
        className="rounded-2xl border border-border bg-surface p-6"
      >
        <h2 id="status-heading" className="text-base font-semibold">
          System status
        </h2>
        <dl className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <dt className="text-muted">API</dt>
          <dd>
            <Suspense
              fallback={
                <span className="text-sm text-muted" role="status">
                  Checking…
                </span>
              }
            >
              <ApiStatus />
            </Suspense>
          </dd>
        </dl>
      </section>
    </main>
  );
}
