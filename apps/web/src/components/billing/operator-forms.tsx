'use client';

import { useActionState } from 'react';

import {
  grantMonths,
  type OperatorState,
  recordPayment,
} from '@/app/actions/billing';
import { FormMessage } from '@/components/auth/field';
import { useMessages } from '@/i18n/client';

const input =
  'block w-full rounded-lg border border-border bg-surface px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/40';
const button =
  'inline-flex items-center justify-center rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-hover disabled:opacity-60';

/** Free months and hand-recorded M-Pesa payments for one account (B9). */
export function OperatorForms({ accountId }: { accountId: string }) {
  const t = useMessages().operator;
  const [g, grant, granting] = useActionState<OperatorState, FormData>(
    grantMonths,
    {},
  );
  const [r, record, recording] = useActionState<OperatorState, FormData>(
    recordPayment,
    {},
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <form action={grant} className="space-y-2" noValidate>
        <p className="text-sm font-medium">{t.grant}</p>
        <FormMessage error={g.error} success={g.success} />
        <input type="hidden" name="accountId" value={accountId} />
        <div className="flex gap-2">
          <label className="sr-only" htmlFor={`g-${accountId}`}>
            {t.months}
          </label>
          <select
            id={`g-${accountId}`}
            name="months"
            defaultValue="1"
            className={input}
          >
            {[1, 3, 6, 12].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button type="submit" disabled={granting} className={button}>
            {granting ? t.saving : t.give}
          </button>
        </div>
      </form>
      <form action={record} className="space-y-2" noValidate>
        <p className="text-sm font-medium">{t.record}</p>
        <FormMessage error={r.error} success={r.success} />
        <input type="hidden" name="accountId" value={accountId} />
        <label className="block text-xs text-muted" htmlFor={`r-${accountId}`}>
          {t.receipt}
        </label>
        <input
          id={`r-${accountId}`}
          name="receipt"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={10}
          placeholder="SJK3ABCD12"
          className={input}
        />
        <div className="flex gap-2">
          <label className="sr-only" htmlFor={`a-${accountId}`}>
            {t.amount}
          </label>
          <input
            id={`a-${accountId}`}
            name="amountKes"
            inputMode="numeric"
            defaultValue="99"
            className={input}
          />
          <label className="sr-only" htmlFor={`m-${accountId}`}>
            {t.months}
          </label>
          <select
            id={`m-${accountId}`}
            name="months"
            defaultValue="1"
            className={input}
          >
            {[1, 12].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button type="submit" disabled={recording} className={button}>
            {recording ? t.saving : t.save}
          </button>
        </div>
      </form>
    </div>
  );
}
