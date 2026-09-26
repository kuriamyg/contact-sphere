import type { CardInput } from '@/lib/vcard-card';

/** A contact card as a QR code with what it contains, readable in print. */
export function QrCard({ card, qr }: { card: CardInput; qr: string }) {
  const lines = [
    [card.jobTitle, card.organization].filter(Boolean).join(', '),
    ...card.phones.slice(0, 3).map((p) => p.raw),
    ...card.emails.slice(0, 2).map((e) => e.address),
  ].filter(Boolean);
  return (
    <figure className="mx-auto w-full max-w-xs space-y-3 rounded-2xl border border-border bg-white p-4 text-center text-black">
      {/* Always black on white: phone cameras read that best, even in dark mode. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qr}
        alt={`QR code with the contact card of ${card.displayName}`}
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
