'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';

import {
  makeRecoveryKey,
  recoverPassword,
  type RecoveryKeyState,
} from '@/app/actions/auth';
import { useMessages } from '@/i18n/client';

import { Field, FormMessage, SubmitButton } from './field';

const buttonClass =
  'rounded-lg border border-border px-4 py-2 text-sm font-medium bg-surface hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none disabled:opacity-60';

/** A recovery key, large and readable, with a Copy button (ADR 0021). */
export function RecoveryKeyBox({ value }: { value: string }) {
  const t = useMessages().recoveryKey;
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle');
  return (
    <div className="space-y-3">
      <p
        aria-label={t.label}
        data-testid="recovery-key"
        className="rounded-lg border border-border bg-surface p-4 text-center font-mono text-xl tracking-wider break-all select-all"
      >
        {value}
      </p>
      <button
        type="button"
        className={buttonClass}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopy('copied');
          } catch {
            setCopy('failed');
          }
        }}
      >
        <span aria-live="polite">
          {copy === 'copied' ? t.copied : copy === 'failed' ? t.failed : t.copy}
        </span>
      </button>
    </div>
  );
}

/** Profile → Recovery key: the password makes a new one. */
export function MakeRecoveryKey() {
  const t = useMessages().recoveryKey;
  const [state, action, pending] = useActionState<RecoveryKeyState, FormData>(
    makeRecoveryKey,
    {},
  );
  if (state.recoveryKey) return <RecoveryKeyBox value={state.recoveryKey} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage error={state.error} />
      <Field
        label={t.password}
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <SubmitButton pending={pending} pendingText={t.making}>
        {t.make}
      </SubmitButton>
    </form>
  );
}

/** Forgot password: number (or email) + recovery key + new password. */
export function RecoverForm() {
  const m = useMessages();
  const t = m.recoveryKey;
  const [state, action, pending] = useActionState<RecoveryKeyState, FormData>(
    recoverPassword,
    {},
  );
  if (state.recoveryKey) {
    return (
      <div className="space-y-4">
        <FormMessage success={t.resetDone} />
        <RecoveryKeyBox value={state.recoveryKey} />
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center rounded-lg btn-primary px-4 py-2.5 text-base font-medium"
        >
          {t.signIn}
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage error={state.error} />
      <Field
        label={t.identifier}
        name="identifier"
        type="text"
        inputMode="tel"
        autoComplete="username"
        defaultValue={state.identifier}
        required
      />
      <Field
        label={t.key}
        name="recoveryKey"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        hint={t.keyHint}
        required
      />
      <Field
        label={m.phoneCode.newPassword}
        name="newPassword"
        type="password"
        autoComplete="new-password"
        minLength={12}
        hint={m.phoneCode.passwordHint}
        required
      />
      <Field
        label={t.confirm}
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        minLength={12}
        required
      />
      <SubmitButton spinner pending={pending} pendingText={t.resetting}>
        {t.reset}
      </SubmitButton>
    </form>
  );
}
