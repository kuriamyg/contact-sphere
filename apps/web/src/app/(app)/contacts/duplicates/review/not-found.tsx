import Link from 'next/link';

import { getMessages } from '@/i18n/server';

export default async function PairNotFound() {
  const t = (await getMessages()).missing;
  return (
    <div className="max-w-xl space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">{t.pairTitle}</h1>
      <p className="text-muted">{t.pairBody}</p>
      <Link href="/contacts/duplicates" className="underline">
        {t.pairBack}
      </Link>
    </div>
  );
}
