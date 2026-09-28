import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { ApiStatusBadge } from '@/components/api-status-badge';
import { OrbitMark } from '@/components/brand/orbit-mark';
import { LegalLinks } from '@/components/legal/legal-links';
import { checkApiHealth } from '@/lib/api-health';
import { getMessages } from '@/i18n/server';

async function ApiStatus() {
  // Checked per request, never baked in at build time.
  await connection();
  const [status, m] = await Promise.all([
    checkApiHealth(process.env.API_URL),
    getMessages(),
  ]);
  return <ApiStatusBadge status={status} t={m.home} />;
}

export default async function Home() {
  const t = (await getMessages()).home;
  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-10 px-4 py-16 sm:px-6"
    >
      <header className="space-y-3">
        <OrbitMark className="size-16" />
        <p className="text-sm font-medium tracking-wide text-muted uppercase">
          {t.eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Contact Sphere
        </h1>
        <p className="max-w-prose text-lg text-muted">{t.lead}</p>
      </header>

      <Link
        href="/login"
        className="self-start rounded-lg btn-primary px-5 py-2.5 font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {t.signIn}
      </Link>

      <section
        aria-labelledby="status-heading"
        className="card rounded-2xl p-6"
      >
        <h2 id="status-heading" className="text-base font-semibold">
          {t.status}
        </h2>
        <dl className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <dt className="text-muted">{t.api}</dt>
          <dd>
            <Suspense
              fallback={
                <span className="text-sm text-muted" role="status">
                  {t.checking}
                </span>
              }
            >
              <ApiStatus />
            </Suspense>
          </dd>
        </dl>
      </section>
      <LegalLinks />
    </main>
  );
}
