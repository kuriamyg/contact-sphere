import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { updateContact } from '@/app/actions/contacts';
import { ContactForm } from '@/components/contacts/contact-form';
import { fromContact } from '@/lib/contact-form';
import { getContact } from '@/lib/contacts';

export const metadata: Metadata = { title: 'Edit contact · Contact Sphere' };

export default async function EditContactPage({
  params,
}: PageProps<'/contacts/[id]/edit'>) {
  const { id } = await params;
  const c = await getContact(id);
  if (!c) notFound();
  // A contact in the trash is read-only until restored.
  if (c.deletedAt) redirect(`/contacts/${id}`);
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Edit {c.displayName}
      </h1>
      <ContactForm
        action={updateContact}
        initial={fromContact(c)}
        contactId={c.id}
        submitText="Save changes"
        cancelHref={`/contacts/${c.id}`}
      />
    </div>
  );
}
