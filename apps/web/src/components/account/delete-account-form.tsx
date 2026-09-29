'use client';

import { useActionState } from 'react';

import { deleteAccount, type FormState } from '@/app/actions/auth';
import { Field, FormMessage } from '@/components/auth/field';
import { useMessages } from '@/i18n/client';

/**
 * Profile → Delete your account (B7). Password, a code when two-factor is
 * on, and DELETE typed out — a stolen session or a slip cannot do it.
 */
export function DeleteAccountForm({
  twoFactor,
  hasPassword = true,
}: {
  twoFactor: boolean;
  /** False for accounts that sign in with Google only (ADR 0020). */
  hasPassword?: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    deleteAccount,
    {},
  );
  const t = useMessages().deleteAccount;
  return (
    <form action={formAction} className="max-w-md space-y-5" noValidate>
      <FormMessage error={state.error} />
      {hasPassword && (
        <Field
          label={t.password}
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      )}
      {twoFactor && (
        <Field
          label={t.code}
          name="code"
          autoComplete="one-time-code"
          inputMode="text"
          required
        />
      )}
      <Field
        label={t.confirm}
        name="confirm"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        hint={t.confirmHint}
        required
      />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="w-full rounded-lg border border-red-300 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60 dark:border-red-900"
      >
        {pending ? t.deleting : t.submit}
      </button>
    </form>
  );
}
