'use client';

import { useActionState } from 'react';

import { type FormState, setup } from '@/app/actions/auth';

import { Field, FormMessage, SubmitButton } from './field';

export function SetupForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    setup,
    {},
  );
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage error={state.error} />
      <Field
        label="Setup token"
        name="setupToken"
        type="password"
        autoComplete="off"
        hint="The one-time token from the server configuration."
        required
        autoFocus
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        required
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={12}
        hint="At least 12 characters. A few unrelated words work well."
        required
      />
      <SubmitButton pending={pending} pendingText="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
