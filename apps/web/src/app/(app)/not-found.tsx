import Link from 'next/link';

import { getMessages } from '@/i18n/server';

/**
 * Any other "not found" inside the app, such as /operator for someone who
 * does not run the service. Replaces the framework's page, whose inline
 * styles the CSP refuses.
 */
export default async function PageNotFound() {
  const t = (await getMessages()).missing;
  return (
    <div className="max-w-xl space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">{t.pageTitle}</h1>
      <p className="text-muted">{t.pageBody}</p>
      <Link href="/today" className="underline">
        {t.pageBack}
      </Link>
    </div>
  );
}
