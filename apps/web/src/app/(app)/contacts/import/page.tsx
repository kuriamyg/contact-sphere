import type { Metadata } from 'next';
import Link from 'next/link';

import { ImportWizard } from '@/components/contacts/import-wizard';

export const metadata: Metadata = { title: 'Import contacts · Contact Sphere' };

export default function ImportPage() {
  return (
    <div className="max-w-xl space-y-8">
      <Link href="/contacts" className="text-sm text-muted hover:underline">
        ← Contacts
      </Link>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Import contacts
        </h1>
        <p className="text-muted">
          From a .vcf (vCard) file. Contacts already saved are skipped, so it is
          safe to import the same file twice. Photos are not imported.
        </p>
      </header>

      <ImportWizard />

      <section aria-labelledby="how" className="space-y-3 text-sm">
        <h2 id="how" className="font-semibold">
          Getting a .vcf file
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>
            <span className="text-foreground">Android (Google Contacts):</span>{' '}
            open Contacts → Fix &amp; manage → Export to file. Samsung: Contacts
            → ☰ → Manage contacts → Import or export → Export.
          </li>
          <li>
            <span className="text-foreground">iPhone:</span> on icloud.com →
            Contacts → select all → Export vCard. Or in the Contacts app, open a
            list, then Export.
          </li>
          <li>
            <span className="text-foreground">Google Contacts on the web:</span>{' '}
            Export → vCard.
          </li>
        </ul>
      </section>
    </div>
  );
}
