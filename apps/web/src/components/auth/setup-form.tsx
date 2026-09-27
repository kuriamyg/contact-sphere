'use client';

import { useActionState } from 'react';

import { type FormState, setup } from '@/app/actions/auth';
import { useMessages } from '@/i18n/client';

import { Field, FormMessage, SubmitButton } from './field';

export function SetupForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    setup,
    {},
  );
  const t = useMessages().setup;
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage error={state.error} />
      <Field
        label={t.token}
        name="setupToken"
        type="password"
        autoComplete="off"
        hint={t.tokenHint}
        required
        autoFocus
      />
      <Field
        label={t.email}
        name="email"
        type="email"
        autoComplete="username"
        required
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
      <SubmitButton spinner pending={pending} pendingText={t.creating}>
        {t.create}
      </SubmitButton>
    </form>
  );
}
