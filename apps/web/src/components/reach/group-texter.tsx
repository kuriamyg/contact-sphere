'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  quoteGroupSms,
  type SendResult,
  sendGroupSms,
} from '@/app/actions/reach';
import { batches, BATCH_SIZES, smsHref, smsSize } from '@/lib/sms-size';

const button =
  'inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none disabled:opacity-60';
const box = 'space-y-3 rounded-2xl border border-border p-4 sm:p-5';

/** Safaricom's weekly bundle: 1,000 SMS for KES 30 (dial *188#). */
const BUNDLE_SMS = 1000;
const BUNDLE_KES = 30;
/** Standard rate without a bundle, about KES 1 per SMS. */
const PAYG_KES = 1;

const n = (x: number) => x.toLocaleString('en-KE');
const kes = (cents: number) =>
  `KES ${(cents / 100).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;

export interface ProviderInfo {
  priceCents: number;
  remaining: number;
}

/**
 * Text a whole group. Cheapest first: from the owner's own phone, in
 * batches, which their SMS bundle pays for. A paid provider route shows
 * only when it is switched on.
 */
export function GroupTexter({
  groupId,
  numbers,
  provider,
}: {
  groupId: string;
  numbers: string[];
  provider: ProviderInfo | null;
}) {
  const [message, setMessage] = useState('');
  const [size, setSize] = useState<number>(20);
  const [ios, setIos] = useState(false);
  const [opened, setOpened] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<SendResult | null>(null);
  const [quote, setQuote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Decided after mount: the server cannot know the device.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
  }, []);

  const s = smsSize(message);
  const parts = message ? s.parts : 1;
  const total = numbers.length * parts;
  const groups = useMemo(() => batches(numbers, size), [numbers, size]);
  const bundleKes = Math.max(1, Math.ceil((total / BUNDLE_SMS) * BUNDLE_KES));

  async function getQuote() {
    setBusy(true);
    const q = await quoteGroupSms(groupId, message);
    setBusy(false);
    setQuote(
      q
        ? `${n(q.recipients)} people × ${q.parts} SMS = ${n(q.totalParts)} SMS, about ${kes(q.costCents)}.` +
            (q.skipped
              ? ` ${n(q.skipped)} without a Kenyan mobile are left out.`
              : '') +
            ` ${n(q.remaining)} SMS left this month.`
        : 'Could not work out the cost. Try again.',
    );
  }

  async function send() {
    if (!window.confirm(`Send this to ${n(numbers.length)} people now?`)) {
      return;
    }
    setBusy(true);
    setResult(await sendGroupSms(groupId, message));
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="message" className="block font-medium">
          Message
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setQuote(null);
            setResult(null);
          }}
          maxLength={900}
          rows={5}
          placeholder="Habari! Our meeting is on Saturday at 3pm…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
        />
        <p className="text-sm text-muted" aria-live="polite">
          {s.length} characters · {parts} SMS each ·{' '}
          <strong className="text-foreground">
            {n(total)} SMS for {n(numbers.length)} people
          </strong>
        </p>
        {s.encoding === 'unicode' && (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            An emoji or special character makes each SMS hold 70 characters
            instead of 160. Remove it to send fewer SMS.
          </p>
        )}
      </div>

      <section aria-labelledby="own-phone" className={box}>
        <h2 id="own-phone" className="text-lg font-semibold">
          Send from my phone <span className="text-accent">· cheapest</span>
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>
            With a Safaricom SMS bundle (dial *188#, e.g. {n(BUNDLE_SMS)} SMS
            for KES {BUNDLE_KES} a week):{' '}
            <strong className="text-foreground">
              about KES {n(bundleKes)}
            </strong>
            .
          </li>
          <li>
            Without a bundle: about KES {n(total * PAYG_KES)} (about KES{' '}
            {PAYG_KES} per SMS).
          </li>
          <li>
            Bundles are for personal messages — your chama, church or family —
            up to {n(BUNDLE_SMS)} SMS a day. For adverts, use a bulk SMS
            service.
          </li>
        </ul>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="batch">People per tap</label>
          <select
            id="batch"
            value={size}
            onChange={(e) => {
              setSize(Number(e.target.value));
              setOpened(new Set());
            }}
            className="rounded-lg border border-border bg-background px-2 py-2"
          >
            {BATCH_SIZES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <ol className="flex flex-wrap gap-2">
          {groups.map((g, i) => {
            const from = i * size + 1;
            const to = from + g.length - 1;
            return (
              <li key={`${size}-${i}`}>
                <a
                  href={smsHref(g, message, ios)}
                  onClick={() => setOpened((o) => new Set(o).add(i))}
                  className={`${button} ${opened.has(i) ? 'border-accent text-accent' : ''}`}
                >
                  {opened.has(i) ? '✓ ' : ''}
                  {groups.length === 1
                    ? `Open Messages (${g.length})`
                    : `Open Messages: ${from}–${to}`}
                </a>
              </li>
            );
          })}
        </ol>
        <p className="text-sm text-muted">
          Each tap opens your Messages app with the numbers and the text filled
          in; press send there. If it offers a “group conversation” or MMS,
          choose separate texts instead — in Google Messages: Settings →
          Advanced → Group messaging → “Send an SMS reply to all recipients and
          get individual replies (mass text)”.
        </p>
      </section>

      {provider && (
        <section aria-labelledby="provider" className={box}>
          <h2 id="provider" className="text-lg font-semibold">
            Send through Contact Sphere
          </h2>
          <p className="text-sm text-muted">
            One tap, from our sender name, at {kes(provider.priceCents)} per
            SMS. {n(provider.remaining)} SMS left this month.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!message.trim() || busy}
              onClick={() => void getQuote()}
              className={button}
            >
              Check the cost
            </button>
            <button
              type="button"
              disabled={!message.trim() || busy}
              onClick={() => void send()}
              className={button}
            >
              Send to everyone
            </button>
          </div>
          {quote && (
            <p className="text-sm" role="status">
              {quote}
            </p>
          )}
          {result && (
            <p
              role="status"
              className={`text-sm ${result.ok ? '' : 'text-red-700 dark:text-red-300'}`}
            >
              {result.message}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
