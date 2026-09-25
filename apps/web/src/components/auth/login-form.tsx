'use client';

import { useActionState } from 'react';

import { type FormState, login } from '@/app/actions/auth';

import { Field, FormMessage, SubmitButton } from './field';

export function LoginForm({ action = login }: { action?: typeof login }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage error={state.error} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        required
        autoFocus
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <SubmitButton pending={pending} pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
