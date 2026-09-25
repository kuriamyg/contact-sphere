'use client';

import { useActionState } from 'react';

import { changePassword, type FormState } from '@/app/actions/auth';

import { Field, FormMessage, SubmitButton } from './field';

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    changePassword,
    {},
  );
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage error={state.error} success={state.success} />
      <Field
        label="Current password"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
      />
      <Field
        label="New password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        minLength={12}
        hint="At least 12 characters."
        required
      />
      <Field
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
      />
      <SubmitButton pending={pending} pendingText="Changing…">
        Change password
      </SubmitButton>
    </form>
  );
}
