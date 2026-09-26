/**
 * Dates as the owner reads them. Pages render on the server (UTC), so the
 * time zone is stated: the owner is in Kenya. Revisit with per-user
 * settings when there is more than one user.
 */
export const APP_TIME_ZONE = 'Africa/Nairobi';

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeZone: APP_TIME_ZONE,
});
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: APP_TIME_ZONE,
});

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string) =>
  dateTimeFmt.format(new Date(iso));

/** A birthday ("1990-04-12") as "12 Apr 1990", with no time-zone shift. */
export const formatBirthday = (ymd: string) =>
  new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${ymd}T00:00:00Z`));

/** Digits for a wa.me link: only for numbers that parsed to E.164. */
export const whatsappHref = (e164: string) =>
  `https://wa.me/${e164.replace(/\D/g, '')}`;
