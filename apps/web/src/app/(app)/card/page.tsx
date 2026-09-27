import type { Metadata } from 'next';
import Link from 'next/link';

import { clearCard } from '@/app/actions/reach';
import { DownloadIcon, PlusIcon } from '@/components/icons';
import { QrCard } from '@/components/reach/qr-card';
import { getMessages, pageTitle } from '@/i18n/server';
import { cardQr, getCard } from '@/lib/reach';

export const generateMetadata = (): Promise<Metadata> => pageTitle('myCard');

const button =
  'inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium bg-surface hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none';

/** The owner's own business card as a QR code. */
export default async function CardPage() {
  const [card, m] = await Promise.all([getCard(), getMessages()]);
  const t = m.card;
  if (!card) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-muted">{t.emptyBody}</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/contacts" className={button}>
            {t.findMyself}
          </Link>
          <Link href="/contacts/new" className={button}>
            <PlusIcon className="size-4" />
            {t.addMyself}
          </Link>
        </div>
      </div>
    );
  }
  const qr = await cardQr(card);
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      <QrCard card={card} qr={qr} />
      <p className="text-sm text-muted">{t.scanHow}</p>
      <div className="flex flex-wrap gap-2">
        <a href="/card/vcf" download className={button}>
          <DownloadIcon className="size-4" />
          {t.downloadVcf}
        </a>
        <Link href={`/contacts/${card.contactId}/edit`} className={button}>
          {t.editDetails}
        </Link>
        <form action={clearCard}>
          <button type="submit" className={button}>
            {t.useDifferent}
          </button>
        </form>
      </div>
    </div>
  );
}
