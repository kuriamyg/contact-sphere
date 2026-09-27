'use server';

import { cookies } from 'next/headers';

import { LANG_COOKIE, parseLocale } from '@/i18n/locales';
import { api, isProduction } from '@/lib/api';

/**
 * Switches the app's language: a cookie for this device (read when pages
 * render) and the account's setting (used for morning reminders). Setting
 * the cookie in an action makes the page re-render in the new language.
 */
export async function setLanguage(value: string): Promise<void> {
  const locale = parseLocale(value);
  if (!locale) return;
  (await cookies()).set(LANG_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    secure: isProduction(),
    httpOnly: false,
  });
  // Best effort: the page still switches if the API is slow.
  await api('/auth/locale', { method: 'PUT', body: { locale } }).catch(
    () => undefined,
  );
}
