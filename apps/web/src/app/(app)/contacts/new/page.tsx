import type { Metadata } from 'next';

import { createContact } from '@/app/actions/contacts';
import { ContactForm } from '@/components/contacts/contact-form';
import { getMessages, pageTitle } from '@/i18n/server';
import { EMPTY_CONTACT } from '@/lib/contact-form';

export const generateMetadata = (): Promise<Metadata> =>
  pageTitle('newContact');

export default async function NewContactPage() {
  const t = (await getMessages()).contactPages;
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t.newTitle}</h1>
      <ContactForm
        action={createContact}
        initial={EMPTY_CONTACT}
        submitText={t.saveContact}
        cancelHref="/contacts"
      />
    </div>
  );
}
