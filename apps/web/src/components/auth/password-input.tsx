'use client';

import { type InputHTMLAttributes, type Ref, useState } from 'react';

import { EyeIcon, EyeOffIcon } from '@/components/icons';
import { useMessages } from '@/i18n/client';

/**
 * A password box with an eye button that shows or hides what was typed.
 * Hidden by default; the button says which it will do next, for screen
 * readers too. Showing it never changes what the form sends.
 */
export function PasswordInput({
  className,
  ref,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  const t = useMessages().form;
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        ref={ref}
        {...input}
        type={shown ? 'text' : 'password'}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={`${className ?? ''} pr-12`}
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? t.hidePassword : t.showPassword}
        aria-pressed={shown}
        aria-controls={input.id}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none"
      >
        {shown ? (
          <EyeOffIcon className="size-5" />
        ) : (
          <EyeIcon className="size-5" />
        )}
      </button>
    </div>
  );
}
