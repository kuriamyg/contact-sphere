'use client';

import { useActionState } from 'react';

import { type FormState, verifyMfa } from '@/app/actions/auth';

import { Field, FormMessage, SubmitButton } from './field';

export function MfaForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    verifyMfa,
    {},
  );
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage error={state.error} />
      <Field
        label="Code"
        name="code"
        inputMode="text"
        autoComplete="one-time-code"
        hint="The 6-digit code from your authenticator app, or one of your recovery codes."
        required
        autoFocus
      />
      <SubmitButton pending={pending} pendingText="Checking…">
        Verify
      </SubmitButton>
    </form>
  );
}
