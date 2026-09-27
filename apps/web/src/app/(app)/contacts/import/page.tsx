import type { Metadata } from 'next';
import Link from 'next/link';

import { ImportWizard } from '@/components/contacts/import-wizard';
import { getMessages, pageTitle } from '@/i18n/server';

export const generateMetadata = (): Promise<Metadata> =>
  pageTitle('importContacts');

export default async function ImportPage() {
  const m = await getMessages();
  const t = m.contactPages.import;
  const how = [
    [t.android, t.androidHow],
    [t.iphone, t.iphoneHow],
    [t.web, t.webHow],
  ] as const;
  return (
    <div className="max-w-xl space-y-6">
      <Link href="/contacts" className="text-sm text-muted hover:underline">
        {m.contacts.detail.back}
      </Link>
      <header className="space-y-1">
        <p className="text-xs font-bold tracking-wider text-accent uppercase">
          {t.eyebrow}
        </p>
        <h1 className="text-[28px] leading-tight font-semibold">{t.title}</h1>
        <p className="text-muted">{t.lead}</p>
      </header>

      <ImportWizard />

      <section aria-labelledby="how" className="space-y-3">
        <h2
          id="how"
          className="text-xs font-bold tracking-wider text-muted uppercase"
        >
          {t.howTitle}
        </h2>
        <p className="text-sm text-muted">{t.howLead}</p>
        <ul className="grid gap-2.5">
          {how.map(([where, steps]) => (
            <li key={where} className="card rounded-2xl p-4 text-sm">
              <p className="font-semibold">{where.replace(/:$/, '')}</p>
              <p className="mt-1 text-muted">{steps}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
