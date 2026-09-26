'use client';

import { useActionState } from 'react';

import { type FormState, updateProfile } from '@/app/actions/auth';
import { FormMessage } from '@/components/auth/field';

/** Your name, as the app shows it. Blank clears it. */
export function NameForm({ current }: { current: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    updateProfile,
    {},
  );
  return (
    <form action={action} className="space-y-3" noValidate>
      <FormMessage error={state.error} success={state.success} />
      <div className="space-y-1.5">
        <label htmlFor="displayName" className="block text-sm font-medium">
          Your name
        </label>
        <div className="flex gap-2">
          <input
            id="displayName"
            name="displayName"
            defaultValue={current ?? ''}
            maxLength={100}
            autoComplete="name"
            placeholder="e.g. Kuria Mwangi"
            className="block min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          />
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="shrink-0 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90 focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  );
}
