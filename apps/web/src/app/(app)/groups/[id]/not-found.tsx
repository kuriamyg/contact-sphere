import Link from 'next/link';

import { getMessages } from '@/i18n/server';

export default async function GroupNotFound() {
  const t = (await getMessages()).missing;
  return (
    <div className="max-w-xl space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">{t.groupTitle}</h1>
      <p className="text-muted">{t.groupBody}</p>
      <Link href="/groups" className="underline">
        {t.groupBack}
      </Link>
    </div>
  );
}
