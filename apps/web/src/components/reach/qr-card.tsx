import { fmt } from '@/i18n/format';
import { getMessages } from '@/i18n/server';
import type { CardInput } from '@/lib/vcard-card';

/** A contact card as a QR code with what it contains, readable in print. */
export async function QrCard({ card, qr }: { card: CardInput; qr: string }) {
  const m = await getMessages();
  const lines = [
    [card.jobTitle, card.organization].filter(Boolean).join(', '),
    ...card.phones.slice(0, 3).map((p) => p.raw),
    ...card.emails.slice(0, 2).map((e) => e.address),
  ].filter(Boolean);
  return (
    <figure className="mx-auto w-full max-w-xs space-y-3 rounded-2xl card bg-white p-4 text-center text-black">
      {/* Always black on white: phone cameras read that best, even in dark mode. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qr}
        alt={fmt(m.card.qrAlt, { name: card.displayName })}
        className="mx-auto aspect-square w-full"
      />
      <figcaption className="space-y-0.5">
        <span className="block text-lg font-semibold break-words">
          {card.displayName}
        </span>
        {lines.map((l) => (
          <span key={l} className="block text-sm break-all">
            {l}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
