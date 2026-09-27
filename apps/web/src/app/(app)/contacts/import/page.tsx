import type { Metadata } from 'next';
import Link from 'next/link';

import { ImportWizard } from '@/components/contacts/import-wizard';
import { getMessages, pageTitle } from '@/i18n/server';

export const generateMetadata = (): Promise<Metadata> =>
  pageTitle('importContacts');

export default async function ImportPage() {
  const m = await getMessages();
  const t = m.contactPages.import;
  return (
    <div className="max-w-xl space-y-8">
      <Link href="/contacts" className="text-sm text-muted hover:underline">
        {m.contacts.detail.back}
      </Link>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-muted">{t.lead}</p>
      </header>

      <ImportWizard />

      <section aria-labelledby="how" className="space-y-3 text-sm">
        <h2 id="how" className="font-semibold">
          {t.howTitle}
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>
            <span className="text-foreground">{t.android}</span> {t.androidHow}
          </li>
          <li>
            <span className="text-foreground">{t.iphone}</span> {t.iphoneHow}
          </li>
          <li>
            <span className="text-foreground">{t.web}</span> {t.webHow}
          </li>
        </ul>
      </section>
    </div>
  );
}
