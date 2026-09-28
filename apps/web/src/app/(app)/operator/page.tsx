import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { OperatorForms } from '@/components/billing/operator-forms';
import { fmt } from '@/i18n/format';
import { getLocale, getMessages, pageTitle } from '@/i18n/server';
import { failedLoad, requireUser } from '@/lib/auth';
import { getAccounts } from '@/lib/billing';
import { formatDate } from '@/lib/format';

export const generateMetadata = (): Promise<Metadata> => pageTitle('operator');

/**
 * The operator's page (B9, ADR 0019): who signed up, their plan, how much
 * they use the app (counts only), and free months or hand-recorded M-Pesa
 * payments. Only the operator gets it; everyone else gets "not found".
 */
export default async function OperatorPage() {
  const user = await requireUser();
  if (!user.operator) notFound();
  const [accounts, m, locale] = await Promise.all([
    getAccounts(),
    getMessages(),
    getLocale(),
  ]);
  if (!accounts) failedLoad(503);
  const t = m.billing;
  const members = accounts.filter((a) => !a.operator);
  const tiles = [
    [t.accounts, members.length],
    [t.onPlus, members.filter((a) => a.plan === 'plus').length],
    [t.paying, members.filter((a) => a.paidKes > 0).length],
    [t.collected, `KES ${members.reduce((n, a) => n + a.paidKes, 0)}`],
  ] as const;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {t.operatorTitle}
        </h1>
        <p className="text-muted">{t.operatorLead}</p>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-border bg-surface p-4"
          >
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      {members.length === 0 && <p className="text-muted">{t.noAccounts}</p>}

      <ul className="space-y-4">
        {members.map((a) => (
          <li
            key={a.id}
            className="space-y-4 rounded-2xl border border-border p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold break-words">
                  {a.displayName ?? a.phone ?? a.email}
                </p>
                <p className="text-sm break-all text-muted">
                  {[a.phone, a.email].filter(Boolean).join(' · ')}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${
                  a.plan === 'plus'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-surface text-muted'
                }`}
              >
                {a.plan === 'plus' ? t.plus : t.free}
              </span>
            </div>
            <p className="text-sm text-muted">
              {fmt(t.joined, { date: formatDate(a.createdAt, locale) })}
              {' · '}
              {a.lastSeenAt
                ? fmt(t.lastSeen, { date: formatDate(a.lastSeenAt, locale) })
                : t.never}
              {' · '}
              {fmt(t.contactsGroups, {
                contacts: a.contacts,
                groups: a.groups,
              })}
              {a.plusUntil &&
                ` · ${fmt(t.plusUntil, { date: formatDate(a.plusUntil, locale) })}`}
              {a.paidKes > 0 && ` · ${fmt(t.paidTotal, { amount: a.paidKes })}`}
            </p>
            <OperatorForms accountId={a.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
