import Link from 'next/link';

import { MpesaPay } from '@/components/billing/mpesa-pay';
import { fmt, plural } from '@/i18n/format';
import type { Locale } from '@/i18n/locales';
import { getMessages } from '@/i18n/server';
import { type BillingStatus, paidRecently } from '@/lib/billing';
import { formatDate } from '@/lib/format';

/** Profile → Your plan (B9): what you have, and how to pay for Plus. */
export async function PlanSection({
  billing,
  phone,
  locale,
}: {
  billing: BillingStatus;
  phone: string | null;
  locale: Locale;
}) {
  const t = (await getMessages()).billing;
  const until = billing.plusUntil
    ? formatDate(billing.plusUntil, locale)
    : null;
  const trial =
    billing.plan === 'plus' &&
    !billing.operator &&
    !billing.payments.some((p) => p.status === 'paid');
  // Keep the pay panel open for a while after a payment, so its
  // "Paid — thank you" stays in view when the page refreshes.
  const justPaid = paidRecently(billing.payments);
  const status = billing.operator
    ? t.operatorPlan
    : billing.plan === 'plus' && until
      ? fmt(trial ? t.trialUntil : t.plusUntil, { date: until })
      : until
        ? fmt(t.lapsed, { date: until })
        : t.freeLead;

  return (
    <div className="space-y-4">
      <p className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${
            billing.plan === 'plus'
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              : 'bg-surface text-muted'
          }`}
        >
          {billing.plan === 'plus' ? t.plus : t.free}
        </span>
        <span className="text-sm">{status}</span>
      </p>
      {billing.operator && (
        <Link href="/operator" className="text-sm font-medium underline">
          {t.operatorTitle} →
        </Link>
      )}
      {!billing.operator && (
        <>
          <p className="text-sm text-muted">
            {t.plusLead} {t.priceLine}
          </p>
          <details
            className="border-t border-border pt-4"
            open={billing.plan === 'free' || justPaid}
          >
            <summary className="cursor-pointer font-medium">{t.renew}</summary>
            <div className="mt-4 space-y-3">
              {billing.mpesa ? (
                <MpesaPay phone={phone} />
              ) : (
                !billing.payTo && (
                  <p className="text-sm text-muted">{t.notYet}</p>
                )
              )}
              {billing.payTo && (
                <p className="text-sm text-muted">
                  {fmt(t.payByHand, { payTo: billing.payTo })}
                </p>
              )}
            </div>
          </details>
        </>
      )}
      {billing.payments.length > 0 && (
        <div className="space-y-2 border-t border-border pt-4">
          <h3 className="font-medium">{t.history}</h3>
          <ul className="space-y-1 text-sm">
            {billing.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2">
                <span>
                  {formatDate(p.paidAt ?? p.createdAt, locale)} ·{' '}
                  {t.methods[p.method]} · {plural(p.months, t.months)}
                  {p.amountKes > 0 && ` · KES ${p.amountKes}`}
                  {p.receipt && ` · ${p.receipt}`}
                </span>
                <span
                  className={
                    p.status === 'paid'
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-muted'
                  }
                >
                  {t.statuses[p.status]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
