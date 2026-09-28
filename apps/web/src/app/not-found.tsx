import Link from 'next/link';

import { getMessages } from '@/i18n/server';

/**
 * Unknown addresses outside the signed-in app. Replaces the framework's
 * page, whose inline styles the CSP refuses.
 */
export default async function PageNotFound() {
  const t = (await getMessages()).missing;
  return (
    <main
      id="main"
      className="mx-auto w-full max-w-xl flex-1 space-y-3 px-4 py-16"
    >
      <h1 className="text-2xl font-semibold tracking-tight">{t.pageTitle}</h1>
      <p className="text-muted">{t.pageBody}</p>
      <Link href="/today" className="underline">
        {t.pageBack}
      </Link>
    </main>
  );
}
