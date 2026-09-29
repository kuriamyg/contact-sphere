'use client';

import { useActionState } from 'react';

import { register, type RegisterState } from '@/app/actions/auth';
import { useMessages } from '@/i18n/client';

import { Field, FormMessage, SubmitButton } from './field';
import { Turnstile, type TurnstileProps } from './turnstile';

/**
 * Sign-up with a mobile number and a password (ADR 0021): one step, no
 * code. The recovery key is shown on the next page.
 */
export function RegisterForm({
  turnstile,
}: {
  turnstile?: TurnstileProps | null;
}) {
  const [state, action, pending] = useActionState<RegisterState, FormData>(
    register,
    {},
  );
  const m = useMessages();
  const t = m.phoneCode;
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage error={state.error} />
      <Field
        label={t.phone}
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        defaultValue={state.phone}
        hint={t.phoneHint}
        required
      />
      <Field
        label={t.name}
        name="displayName"
        autoComplete="name"
        defaultValue={state.displayName}
        maxLength={80}
      />
      <Field
        label={t.password}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={12}
        hint={t.passwordHint}
        required
      />
      <Field
        label={m.register.confirm}
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        minLength={12}
        required
      />
      {turnstile && <Turnstile {...turnstile} resetKey={state} />}
      <SubmitButton spinner pending={pending} pendingText={t.creating}>
        {t.create}
      </SubmitButton>
    </form>
  );
}
