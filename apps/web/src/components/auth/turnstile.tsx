'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

import { useLocale } from '@/i18n/client';
import { TURNSTILE_ORIGIN } from '@/lib/csp';

interface TurnstileApi {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(id?: string): void;
  remove(id: string): void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Where the check sits in a sign-up form, when it is on. */
export interface TurnstileProps {
  siteKey: string;
  /** This request's CSP nonce, so the script may run. */
  nonce: string;
}

/**
 * Cloudflare Turnstile (C3): usually invisible, sometimes one tap. It puts
 * a one-use token in the form as `turnstileToken`; the API checks it with
 * Cloudflare. A new token is fetched after every attempt (`resetKey`).
 */
export function Turnstile({
  siteKey,
  nonce,
  resetKey,
}: TurnstileProps & { resetKey?: unknown }) {
  const locale = useLocale();
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const api = window.turnstile;
    if (!ready || !api || !box.current || id.current) return;
    id.current = api.render(box.current, {
      sitekey: siteKey,
      'response-field-name': 'turnstileToken',
      theme: 'auto',
      size: 'flexible',
      language: locale,
    });
    return () => {
      if (id.current) api.remove(id.current);
      id.current = null;
    };
  }, [ready, siteKey, locale]);

  useEffect(() => {
    if (id.current && resetKey) window.turnstile?.reset(id.current);
  }, [resetKey]);

  return (
    <>
      <Script
        src={`${TURNSTILE_ORIGIN}/turnstile/v0/api.js?render=explicit`}
        nonce={nonce}
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div ref={box} data-testid="turnstile" className="min-h-[65px]" />
    </>
  );
}
