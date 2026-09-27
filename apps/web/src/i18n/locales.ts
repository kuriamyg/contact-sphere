/**
 * The languages the app speaks. English is the source; every other
 * dictionary must have exactly the same keys (checked by TypeScript).
 */
export const LOCALES = ['en', 'sw'] as const;
export type Locale = (typeof LOCALES)[number];
export const LANG_COOKIE = 'cs-lang';

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  sw: 'Kiswahili',
};

/** BCP 47 tags for Intl date formatting. */
export const INTL_TAG: Record<Locale, string> = {
  en: 'en-GB',
  sw: 'sw-KE',
};

export function parseLocale(value: string | undefined | null): Locale | null {
  return (LOCALES as readonly string[]).includes(value ?? '')
    ? (value as Locale)
    : null;
}

/** First choice from the browser's Accept-Language that we speak. */
export function fromAcceptLanguage(header: string | null): Locale {
  for (const part of (header ?? '').split(',')) {
    const tag = part.split(';')[0].trim().toLowerCase();
    if (tag === 'sw' || tag.startsWith('sw-')) return 'sw';
    if (tag === 'en' || tag.startsWith('en-')) return 'en';
  }
  return 'en';
}

/** In the browser: switch and remember on this device for a year. */
export function rememberLocale(locale: Locale): void {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${LANG_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}
