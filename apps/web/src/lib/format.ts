import { INTL_TAG, type Locale } from '@/i18n/locales';

/**
 * Dates as the owner reads them, in their language. Pages render on the
 * server (UTC), so the time zone is stated: the owner is in Kenya.
 */
export const APP_TIME_ZONE = 'Africa/Nairobi';

export const formatDate = (iso: string, locale: Locale = 'en') =>
  new Intl.DateTimeFormat(INTL_TAG[locale], {
    dateStyle: 'medium',
    timeZone: APP_TIME_ZONE,
  }).format(new Date(iso));

export const formatDateTime = (iso: string, locale: Locale = 'en') =>
  new Intl.DateTimeFormat(INTL_TAG[locale], {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: APP_TIME_ZONE,
  }).format(new Date(iso));

/** A birthday ("1990-04-12") as "12 Apr 1990", with no time-zone shift. */
export const formatBirthday = (ymd: string, locale: Locale = 'en') =>
  new Intl.DateTimeFormat(INTL_TAG[locale], {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${ymd}T00:00:00Z`));

/** Digits for a wa.me link: only for numbers that parsed to E.164. */
export const whatsappHref = (e164: string, text?: string) =>
  `https://wa.me/${e164.replace(/\D/g, '')}${
    text ? `?text=${encodeURIComponent(text)}` : ''
  }`;

/** A calendar day ("2026-10-03") as "Sat, 3 Oct" (or "Jumamosi, 3 Okt"). */
export function formatDay(day: string, locale: Locale = 'en'): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-KE' : INTL_TAG[locale], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00Z`));
}
