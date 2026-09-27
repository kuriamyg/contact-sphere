'use client';

import { useActionState } from 'react';

import { type FormState, updateProfile } from '@/app/actions/auth';
import { FormMessage } from '@/components/auth/field';
import { useMessages } from '@/i18n/client';

/** Your name, as the app shows it. Blank clears it. */
export function NameForm({ current }: { current: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    updateProfile,
    {},
  );
  const all = useMessages();
  const t = all.name;
  return (
    <form action={action} className="space-y-3" noValidate>
      <FormMessage error={state.error} success={state.success} />
      <div className="space-y-1.5">
        <label htmlFor="displayName" className="block text-sm font-medium">
          {t.label}
        </label>
        <div className="flex gap-2">
          <input
            id="displayName"
            name="displayName"
            defaultValue={current ?? ''}
            maxLength={100}
            autoComplete="name"
            placeholder={t.placeholder}
            className="block min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          />
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="shrink-0 rounded-lg btn-primary px-4 py-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
          >
            {pending ? all.form.saving : all.form.save}
          </button>
        </div>
      </div>
    </form>
  );
}
