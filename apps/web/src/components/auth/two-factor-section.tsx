'use client';

import { useActionState, useState, useTransition } from 'react';

import {
  disableTotp,
  enableTotp,
  type FormState,
  startTotpSetup,
  type TotpSetupState,
} from '@/app/actions/auth';

import { Field, FormMessage, SubmitButton } from './field';

const buttonClass =
  'rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none disabled:opacity-60';

/** Groups a base32 secret in fours so it can be typed without mistakes. */
function grouped(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(' ') ?? secret;
}

function Enrol() {
  const [setup, setSetup] = useState<TotpSetupState | null>(null);
  const [starting, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState<TotpSetupState, FormData>(
    enableTotp,
    {},
  );

  if (state.recoveryCodes) {
    return (
      <div className="space-y-3">
        <FormMessage success="Two-factor is on. Other devices were signed out." />
        <p className="font-medium">Save your recovery codes now.</p>
        <p className="text-sm text-muted">
          Each works once if you lose your phone. They will not be shown again.
          Keep them somewhere safe and offline — not in this app.
        </p>
        <ul
          aria-label="Recovery codes"
          className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-surface p-4 font-mono text-sm"
        >
          {state.recoveryCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (!setup?.secret) {
    return (
      <div className="space-y-3">
        <FormMessage error={setup?.error} />
        <p className="text-sm text-muted">
          Adds a second step to signing in: a code from an authenticator app
          (such as Google Authenticator, Microsoft Authenticator or Aegis).
        </p>
        <button
          type="button"
          className={buttonClass}
          disabled={starting}
          onClick={() =>
            startTransition(async () => setSetup(await startTotpSetup()))
          }
        >
          {starting ? 'Preparing…' : 'Set up two-factor'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>
          Scan this code with your authenticator app
          {setup.uri && (
            <>
              {' '}
              — or, on this phone,{' '}
              <a href={setup.uri} className="underline">
                open it in the app
              </a>
            </>
          )}
          .
        </li>
        <li>Enter the 6-digit code it shows.</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element -- a data URI, nothing to optimise */}
      <img
        src={setup.qr}
        alt="QR code for your authenticator app"
        width={192}
        height={192}
        className="rounded-lg border border-border bg-white p-2"
      />
      <p className="text-sm text-muted">
        Can’t scan? Enter this key:{' '}
        <code className="font-mono text-foreground">
          {grouped(setup.secret)}
        </code>
      </p>
      <form action={formAction} className="space-y-4" noValidate>
        <FormMessage error={state.error} />
        <Field
          label="Code from the app"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          required
        />
        <SubmitButton pending={pending} pendingText="Turning on…">
          Turn on two-factor
        </SubmitButton>
      </form>
    </div>
  );
}

function Disable({ recoveryCodesLeft }: { recoveryCodesLeft: number }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    disableTotp,
    {},
  );
  if (state.success) return <FormMessage success={state.success} />;
  return (
    <div className="space-y-4">
      <p className="text-sm">
        <span className="font-medium">Two-factor is on.</span>{' '}
        <span className="text-muted">
          {recoveryCodesLeft} recovery code{recoveryCodesLeft === 1 ? '' : 's'}{' '}
          left.
        </span>
      </p>
      <details className="space-y-4">
        <summary className="cursor-pointer text-sm underline">
          Turn two-factor off
        </summary>
        <form action={formAction} className="mt-4 space-y-4" noValidate>
          <FormMessage error={state.error} />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          <Field
            label="Code from the app (or a recovery code)"
            name="code"
            autoComplete="one-time-code"
            required
          />
          <SubmitButton pending={pending} pendingText="Turning off…">
            Turn off two-factor
          </SubmitButton>
        </form>
      </details>
    </div>
  );
}

export function TwoFactorSection({
  enabled,
  recoveryCodesLeft,
}: {
  enabled: boolean;
  recoveryCodesLeft: number;
}) {
  return enabled ? (
    <Disable recoveryCodesLeft={recoveryCodesLeft} />
  ) : (
    <Enrol />
  );
}
