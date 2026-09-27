import Link from 'next/link';

import { getMessages } from '@/i18n/server';

export default async function ContactNotFound() {
  const t = (await getMessages()).missing;
  return (
    <div className="max-w-xl space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t.contactTitle}
      </h1>
      <p className="text-muted">{t.contactBody}</p>
      <Link href="/contacts" className="underline">
        {t.contactBack}
      </Link>
    </div>
  );
}
