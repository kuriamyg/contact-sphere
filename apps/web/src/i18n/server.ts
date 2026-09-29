import 'server-only';

import { cookies, headers } from 'next/headers';
import { cache } from 'react';

import { isKnownApiMessage, localizeApiMessage } from './api-messages';
import { en, type Messages } from './en';
import { fmt } from './format';
import {
  fromAcceptLanguage,
  type Locale,
  LANG_COOKIE,
  parseLocale,
} from './locales';
import { sw } from './sw';

const DICTIONARIES: Record<Locale, Messages> = { en, sw };

/** The chosen language (cookie), else the browser's, else English. */
export const getLocale = cache(async (): Promise<Locale> => {
  const chosen = parseLocale((await cookies()).get(LANG_COOKIE)?.value);
  if (chosen) return chosen;
  return fromAcceptLanguage((await headers()).get('accept-language'));
});

export async function getMessages(): Promise<Messages> {
  return DICTIONARIES[await getLocale()];
}

export function messagesFor(locale: Locale): Messages {
  return DICTIONARIES[locale];
}

/** "Today · Contact Sphere", in the reader's language. */
export async function pageTitle(
  key: Exclude<keyof Messages['meta'], 'suffix' | 'description'>,
): Promise<{ title: string }> {
  const m = await getMessages();
  return { title: fmt(m.meta.suffix, { page: m.meta[key] }) };
}

/** An API message in the reader's language (as sent, if unknown). */
export async function apiText(message?: string): Promise<string | undefined> {
  return localizeApiMessage(message, await getLocale());
}

/**
 * The error to show for a failed API call: our own message when the API
 * sent one (translated), else "unavailable" for server errors and a
 * generic line otherwise. Never a framework default like "Internal server
 * error".
 */
export async function apiError(
  status: number,
  message?: string,
): Promise<string> {
  const t = (await getMessages()).errors;
  if (status >= 500 || status === 0) {
    return isKnownApiMessage(message)
      ? ((await apiText(message)) ?? t.unavailable)
      : t.unavailable;
  }
  return (await apiText(message)) ?? (status === 429 ? t.tooMany : t.generic);
}
