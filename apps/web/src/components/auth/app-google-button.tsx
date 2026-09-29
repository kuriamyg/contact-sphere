'use client';

import { useState } from 'react';

import { FormMessage } from '@/components/auth/field';
import { GoogleButtonFace } from '@/components/auth/google-button';
import { useMessages } from '@/i18n/client';

interface Bridge {
  nativePromise?: (p: string, m: string, o: object) => Promise<unknown>;
}

/**
 * "Continue with Google" inside the Android app (ADR 0025): the app opens
 * Google in the phone's browser and comes back signed in.
 */
export function AppGoogleButton({ label }: { label: string }) {
  const t = useMessages().appSignIn;
  const [error, setError] = useState<string>();
  const start = () => {
    setError(undefined);
    const b = (globalThis as { Capacitor?: Bridge }).Capacitor;
    if (!b?.nativePromise) {
      setError(t.update);
      return;
    }
    b.nativePromise('AppSignIn', 'google', {}).catch(() => setError(t.update));
  };
  return (
    <div className="space-y-2">
      <GoogleButtonFace label={label} onClick={start} />
      <FormMessage error={error} />
    </div>
  );
}
