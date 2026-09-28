'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';

import {
  checkPayment,
  type PayState,
  payWithMpesa,
} from '@/app/actions/billing';
import { Field, FormMessage, SubmitButton } from '@/components/auth/field';
import { useMessages } from '@/i18n/client';
import { fmt } from '@/i18n/format';

const POLL_MS = 4000;
const GIVE_UP_MS = 4 * 60_000;

/**
 * Pay for Plus with the M-Pesa prompt (B9): choose 1 or 12 months, send the
 * prompt, then watch the payment until the customer enters their PIN.
 */
export function MpesaPay({ phone }: { phone: string | null }) {
  const t = useMessages().pay;
  const router = useRouter();
  const [state, action, pending] = useActionState<PayState, FormData>(
    payWithMpesa,
    {},
  );
  const [outcome, setOutcome] = useState<{
    id: string;
    status: 'paid' | 'failed';
    reason?: string;
  } | null>(null);

  const waitingFor =
    state.paymentId && outcome?.id !== state.paymentId ? state.paymentId : null;

  useEffect(() => {
    if (!waitingFor) return;
    const started = Date.now();
    let stop = false;
    const tick = async () => {
      if (stop) return;
      const p = await checkPayment(waitingFor);
      if (stop) return;
      if (p && p.status !== 'pending') {
        setOutcome({
          id: waitingFor,
          status: p.status,
          reason: p.resultDesc ?? undefined,
        });
        if (p.status === 'paid') router.refresh();
        return;
      }
      if (Date.now() - started < GIVE_UP_MS) {
        timer = setTimeout(() => void tick(), POLL_MS);
      }
    };
    let timer = setTimeout(() => void tick(), POLL_MS);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [waitingFor, router]);

  if (outcome?.status === 'paid' && outcome.id === state.paymentId) {
    return <FormMessage success={t.paid} />;
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      {waitingFor ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
        >
          {fmt(t.checkPhone, { amount: String(state.amountKes ?? 99) })}
        </p>
      ) : (
        <FormMessage
          error={
            state.error ??
            (outcome?.status === 'failed'
              ? fmt(t.failed, { reason: outcome.reason ?? '' })
              : undefined)
          }
        />
      )}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t.choose}</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="months"
            value="1"
            defaultChecked={state.amountKes !== 990}
          />
          {t.month}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="months"
            value="12"
            defaultChecked={state.amountKes === 990}
          />
          {t.year}
        </label>
      </fieldset>
      <Field
        label={t.phone}
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        defaultValue={phone ?? ''}
        required
      />
      <SubmitButton pending={pending} pendingText={t.sending}>
        {outcome?.status === 'failed' ? t.tryAgain : t.pay}
      </SubmitButton>
    </form>
  );
}
