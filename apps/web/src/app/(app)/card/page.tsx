import type { Metadata } from 'next';
import Link from 'next/link';

import { clearCard } from '@/app/actions/reach';
import { DownloadIcon, PlusIcon } from '@/components/icons';
import { QrCard } from '@/components/reach/qr-card';
import { cardQr, getCard } from '@/lib/reach';

export const metadata: Metadata = { title: 'My card · Contact Sphere' };

const button =
  'inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium bg-surface hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none';

/** The owner's own business card as a QR code. */
export default async function CardPage() {
  const card = await getCard();
  if (!card) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">My card</h1>
        <p className="text-muted">
          Your card is your own entry in your contacts. Open it and tap{' '}
          <strong>This is me</strong>. It shows here as a QR code that anyone
          can scan with their phone camera to save your number.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/contacts" className={button}>
            Find myself in contacts
          </Link>
          <Link href="/contacts/new" className={button}>
            <PlusIcon className="size-4" />
            Add myself
          </Link>
        </div>
      </div>
    );
  }
  const qr = await cardQr(card);
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">My card</h1>
      <QrCard card={card} qr={qr} />
      <p className="text-sm text-muted">
        Ask them to point their phone camera at the code and tap to save. Print
        it on a flyer, a shop door or a business card too — it works offline.
      </p>
      <div className="flex flex-wrap gap-2">
        <a href="/card/vcf" download className={button}>
          <DownloadIcon className="size-4" />
          Download .vcf
        </a>
        <Link href={`/contacts/${card.contactId}/edit`} className={button}>
          Edit my details
        </Link>
        <form action={clearCard}>
          <button type="submit" className={button}>
            Use a different contact
          </button>
        </form>
      </div>
    </div>
  );
}
