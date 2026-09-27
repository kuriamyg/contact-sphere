import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { QrCard } from '@/components/reach/qr-card';
import { getContact, UUID } from '@/lib/contacts';
import { getMessages, pageTitle } from '@/i18n/server';
import { cardQr } from '@/lib/reach';

export const generateMetadata = (): Promise<Metadata> => pageTitle('shareQr');

/** Hand a contact to someone standing next to you: they scan, it saves. */
export default async function ContactQrPage({
  params,
}: PageProps<'/contacts/[id]/qr'>) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const c = await getContact(id);
  if (!c || c.deletedAt) notFound();
  const [qr, m] = await Promise.all([cardQr(c), getMessages()]);
  return (
    <div className="mx-auto max-w-md space-y-6">
      <Link
        href={`/contacts/${c.id}`}
        className="text-sm text-muted hover:underline"
      >
        ← {c.displayName}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">
        {m.card.shareTitle}
      </h1>
      <QrCard card={c} qr={qr} />
      <p className="text-sm text-muted">{m.card.shareHow}</p>
    </div>
  );
}
