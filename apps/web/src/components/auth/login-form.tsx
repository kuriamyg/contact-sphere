'use client';

import { useActionState } from 'react';

import { type FormState, login } from '@/app/actions/auth';
import { useMessages } from '@/i18n/client';

import { Field, FormMessage, SubmitButton } from './field';

export function LoginForm({ action = login }: { action?: typeof login }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );
  const t = useMessages().login;
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage error={state.error} />
      <Field
        label={t.email}
        name="email"
        type="email"
        autoComplete="username"
        required
        autoFocus
      />
      <Field
        label={t.password}
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <SubmitButton pending={pending} pendingText={t.signingIn}>
        {t.signIn}
      </SubmitButton>
    </form>
  );
}
