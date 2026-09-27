'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  quoteGroupSms,
  type SendResult,
  sendGroupSms,
} from '@/app/actions/reach';
import { fmt, plural } from '@/i18n/format';
import { useMessages } from '@/i18n/client';
import { batches, BATCH_SIZES, smsHref, smsSize } from '@/lib/sms-size';

const button =
  'inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium bg-surface hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none disabled:opacity-60';
const box = 'space-y-3 rounded-2xl card p-4 sm:p-5';

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
  const t = useMessages().texter;
  const people = (x: number) => plural(x, t.people, { n: n(x) });
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
        ? [
            fmt(t.quote, {
              people: people(q.recipients),
              parts: q.parts,
              total: n(q.totalParts),
              cost: kes(q.costCents),
            }),
            q.skipped ? fmt(t.quoteSkipped, { n: n(q.skipped) }) : '',
            fmt(t.quoteLeft, { n: n(q.remaining) }),
          ]
            .filter(Boolean)
            .join(' ')
        : t.quoteFailed,
    );
  }

  async function send() {
    if (!window.confirm(fmt(t.confirm, { people: people(numbers.length) }))) {
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
          {t.message}
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
          placeholder={t.placeholder}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
        />
        <p className="text-sm text-muted" aria-live="polite">
          {fmt(t.counter, { chars: s.length, parts })}{' '}
          <strong className="text-foreground">
            {fmt(t.total, { total: n(total), people: people(numbers.length) })}
          </strong>
        </p>
        {s.encoding === 'unicode' && (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {t.unicode}
          </p>
        )}
      </div>

      <section aria-labelledby="own-phone" className={box}>
        <h2 id="own-phone" className="text-lg font-semibold">
          {t.fromPhone} <span className="text-accent">{t.cheapest}</span>
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>
            {fmt(t.bundle, { bundleSms: n(BUNDLE_SMS), bundleKes: BUNDLE_KES })}{' '}
            <strong className="text-foreground">
              {fmt(t.about, { kes: n(bundleKes) })}
            </strong>
            .
          </li>
          <li>
            {fmt(t.noBundle, { kes: n(total * PAYG_KES), rate: PAYG_KES })}
          </li>
          <li>{fmt(t.personal, { limit: n(BUNDLE_SMS) })}</li>
        </ul>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="batch">{t.perTap}</label>
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
                    ? fmt(t.openOne, { n: g.length })
                    : fmt(t.openRange, { from, to })}
                </a>
              </li>
            );
          })}
        </ol>
        <p className="text-sm text-muted">{t.howTo}</p>
      </section>

      {provider && (
        <section aria-labelledby="provider" className={box}>
          <h2 id="provider" className="text-lg font-semibold">
            {t.viaUs}
          </h2>
          <p className="text-sm text-muted">
            {fmt(t.viaUsDetail, {
              price: kes(provider.priceCents),
              left: n(provider.remaining),
            })}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!message.trim() || busy}
              onClick={() => void getQuote()}
              className={button}
            >
              {t.checkCost}
            </button>
            <button
              type="button"
              disabled={!message.trim() || busy}
              onClick={() => void send()}
              className={button}
            >
              {t.sendAll}
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
