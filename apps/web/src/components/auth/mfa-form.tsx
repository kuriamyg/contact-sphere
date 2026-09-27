'use client';

import { useActionState } from 'react';

import { type FormState, verifyMfa } from '@/app/actions/auth';
import { useMessages } from '@/i18n/client';

import { Field, FormMessage, SubmitButton } from './field';

export function MfaForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    verifyMfa,
    {},
  );
  const t = useMessages().mfa;
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage error={state.error} />
      <Field
        label={t.code}
        name="code"
        inputMode="text"
        autoComplete="one-time-code"
        hint={t.codeHint}
        required
        autoFocus
      />
      <SubmitButton spinner pending={pending} pendingText={t.checking}>
        {t.verify}
      </SubmitButton>
    </form>
  );
}
