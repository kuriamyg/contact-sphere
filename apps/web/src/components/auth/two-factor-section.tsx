'use client';

import { useActionState, useState, useTransition } from 'react';

import {
  disableTotp,
  enableTotp,
  type FormState,
  startTotpSetup,
  type TotpSetupState,
} from '@/app/actions/auth';

import { plural } from '@/i18n/format';
import { useMessages } from '@/i18n/client';

import { Field, FormMessage, SubmitButton } from './field';

const buttonClass =
  'rounded-lg border border-border px-4 py-2 text-sm font-medium bg-surface hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none disabled:opacity-60';

/** Groups a base32 secret in fours so it can be typed without mistakes. */
function grouped(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(' ') ?? secret;
}

function Enrol() {
  const t = useMessages().twoFactor;
  const [setup, setSetup] = useState<TotpSetupState | null>(null);
  const [starting, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState<TotpSetupState, FormData>(
    enableTotp,
    {},
  );

  if (state.recoveryCodes) {
    return (
      <div className="space-y-3">
        <FormMessage success={t.onNow} />
        <p className="font-medium">{t.saveCodes}</p>
        <p className="text-sm text-muted">{t.codesExplain}</p>
        <ul
          aria-label={t.codesLabel}
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
        <p className="text-sm text-muted">{t.intro}</p>
        <button
          type="button"
          className={buttonClass}
          disabled={starting}
          onClick={() =>
            startTransition(async () => setSetup(await startTotpSetup()))
          }
        >
          {starting ? t.preparing : t.setUp}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>
          {t.scan}
          {setup.uri && (
            <>
              {' '}
              {t.orOpen}{' '}
              <a href={setup.uri} className="underline">
                {t.openInApp}
              </a>
            </>
          )}
          .
        </li>
        <li>{t.enterCode}</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element -- a data URI, nothing to optimise */}
      <img
        src={setup.qr}
        alt={t.qrAlt}
        width={192}
        height={192}
        className="rounded-lg border border-border bg-white p-2"
      />
      <p className="text-sm text-muted">
        {t.cantScan}{' '}
        <code className="font-mono text-foreground">
          {grouped(setup.secret)}
        </code>
      </p>
      <form action={formAction} className="space-y-4" noValidate>
        <FormMessage error={state.error} />
        <Field
          label={t.codeFromApp}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          required
        />
        <SubmitButton pending={pending} pendingText={t.turningOn}>
          {t.turnOn}
        </SubmitButton>
      </form>
    </div>
  );
}

function Disable({ recoveryCodesLeft }: { recoveryCodesLeft: number }) {
  const t = useMessages().twoFactor;
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    disableTotp,
    {},
  );
  if (state.success) return <FormMessage success={state.success} />;
  return (
    <div className="space-y-4">
      <p className="text-sm">
        <span className="font-medium">{t.isOn}</span>{' '}
        <span className="text-muted">
          {plural(recoveryCodesLeft, t.codesLeft)}
        </span>
      </p>
      <details className="space-y-4">
        <summary className="cursor-pointer text-sm underline">
          {t.turnOffSummary}
        </summary>
        <form action={formAction} className="mt-4 space-y-4" noValidate>
          <FormMessage error={state.error} />
          <Field
            label={t.passwordLabel}
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          <Field
            label={t.codeOrRecovery}
            name="code"
            autoComplete="one-time-code"
            required
          />
          <SubmitButton pending={pending} pendingText={t.turningOff}>
            {t.turnOff}
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
