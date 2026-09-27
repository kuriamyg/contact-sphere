import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { updateContact } from '@/app/actions/contacts';
import { ContactForm } from '@/components/contacts/contact-form';
import { fromContact } from '@/lib/contact-form';
import { getContact } from '@/lib/contacts';
import { fmt } from '@/i18n/format';
import { getMessages, pageTitle } from '@/i18n/server';

export const generateMetadata = (): Promise<Metadata> =>
  pageTitle('editContact');

export default async function EditContactPage({
  params,
}: PageProps<'/contacts/[id]/edit'>) {
  const { id } = await params;
  const c = await getContact(id);
  if (!c) notFound();
  // A contact in the trash is read-only until restored.
  if (c.deletedAt) redirect(`/contacts/${id}`);
  const t = (await getMessages()).contactPages;
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {fmt(t.editTitle, { name: c.displayName })}
      </h1>
      <ContactForm
        action={updateContact}
        initial={fromContact(c)}
        contactId={c.id}
        submitText={t.saveChanges}
        cancelHref={`/contacts/${c.id}`}
      />
    </div>
  );
}
