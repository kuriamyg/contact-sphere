import type { Metadata } from 'next';

import { createContact } from '@/app/actions/contacts';
import { ContactForm } from '@/components/contacts/contact-form';
import { EMPTY_CONTACT } from '@/lib/contact-form';

export const metadata: Metadata = { title: 'New contact · Contact Sphere' };

export default function NewContactPage() {
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New contact</h1>
      <ContactForm
        action={createContact}
        initial={EMPTY_CONTACT}
        submitText="Save contact"
        cancelHref="/contacts"
      />
    </div>
  );
}
