'use client';

import { useActionState } from 'react';

import { changePassword, type FormState } from '@/app/actions/auth';
import { useMessages } from '@/i18n/client';

import { Field, FormMessage, SubmitButton } from './field';

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    changePassword,
    {},
  );
  const t = useMessages().password;
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage error={state.error} success={state.success} />
      <Field
        label={t.current}
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
      />
      <Field
        label={t.next}
        name="newPassword"
        type="password"
        autoComplete="new-password"
        minLength={12}
        hint={t.nextHint}
        required
      />
      <Field
        label={t.confirm}
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
      />
      <SubmitButton pending={pending} pendingText={t.changing}>
        {t.change}
      </SubmitButton>
    </form>
  );
}
