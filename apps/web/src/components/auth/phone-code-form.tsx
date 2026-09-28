'use client';

import { useActionState, useState } from 'react';

import {
  type PhoneCodeState,
  resetPassword,
  sendResetCode,
  sendSignupCode,
  signup,
} from '@/app/actions/auth';
import { useMessages } from '@/i18n/client';
import { fmt } from '@/i18n/format';

import { Field, FormMessage, SubmitButton } from './field';

const ACTIONS = {
  signup: { send: sendSignupCode, finish: signup },
  reset: { send: sendResetCode, finish: resetPassword },
};

/**
 * Two steps on one page (B6): the mobile number, then the code from the SMS
 * with the new password. Used for sign-up and for "forgot password".
 */
export function PhoneCodeForm({ purpose }: { purpose: 'signup' | 'reset' }) {
  const { send, finish } = ACTIONS[purpose];
  const [sent, sendAction, sending] = useActionState<PhoneCodeState, FormData>(
    send,
    {},
  );
  const [done, finishAction, finishing] = useActionState<
    PhoneCodeState,
    FormData
  >(finish, {});
  const [changing, setChanging] = useState(false);
  const t = useMessages().phoneCode;

  if (!sent.phone || changing) {
    return (
      <form
        action={sendAction}
        onSubmit={() => setChanging(false)}
        className="space-y-5"
        noValidate
      >
        <FormMessage error={sent.error} />
        <Field
          label={t.phone}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={sent.phone}
          hint={t.phoneHint}
          required
          autoFocus
        />
        <SubmitButton spinner pending={sending} pendingText={t.sending}>
          {t.sendCode}
        </SubmitButton>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <form action={finishAction} className="space-y-5" noValidate>
        <FormMessage
          error={done.error ?? sent.error}
          success={fmt(t.sentTo, { phone: sent.phone })}
        />
        <input type="hidden" name="phone" value={sent.phone} />
        <Field
          label={t.code}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          autoFocus
        />
        {purpose === 'signup' && (
          <Field
            label={t.name}
            name="displayName"
            autoComplete="name"
            defaultValue={done.displayName}
            maxLength={80}
          />
        )}
        <Field
          label={purpose === 'signup' ? t.password : t.newPassword}
          name={purpose === 'signup' ? 'password' : 'newPassword'}
          type="password"
          autoComplete="new-password"
          minLength={12}
          hint={t.passwordHint}
          required
        />
        <SubmitButton
          spinner
          pending={finishing}
          pendingText={purpose === 'signup' ? t.creating : t.saving}
        >
          {purpose === 'signup' ? t.create : t.save}
        </SubmitButton>
      </form>
      <div className="flex flex-wrap justify-between gap-3 text-sm">
        <form action={sendAction}>
          <input type="hidden" name="phone" value={sent.phone} />
          <input type="hidden" name="resend" value="1" />
          <button
            type="submit"
            disabled={sending}
            className="font-medium underline disabled:opacity-60"
          >
            {sending ? t.sending : t.resend}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setChanging(true)}
          className="text-muted underline"
        >
          {t.otherNumber}
        </button>
      </div>
    </div>
  );
}
