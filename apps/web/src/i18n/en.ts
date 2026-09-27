import { account } from './sections/account';
import { auth } from './sections/auth';
import { card } from './sections/card';
import { client } from './sections/client';
import { common } from './sections/common';
import { contactPages } from './sections/contact-pages';
import { contacts } from './sections/contacts';
import { duplicates } from './sections/duplicates';
import { errors } from './sections/errors';
import { groups } from './sections/groups';
import { home } from './sections/home';
import { meta } from './sections/meta';
import { missing } from './sections/missing';
import { notices } from './sections/notices';
import { remember } from './sections/remember';
import { today } from './sections/today';

const ALL = {
  account,
  auth,
  card,
  client,
  common,
  contactPages,
  contacts,
  duplicates,
  errors,
  groups,
  home,
  meta,
  missing,
  notices,
  remember,
  today,
};

/** Every section's English shape; Kiswahili is checked against it per section. */
export type Messages = { [K in keyof typeof ALL]: (typeof ALL)[K]['en'] };

function pick(l: 'en' | 'sw'): Messages {
  return Object.fromEntries(
    Object.entries(ALL).map(([k, v]) => [k, v[l]]),
  ) as Messages;
}

/** English: the source of every string. */
export const en = pick('en');
/** Kiswahili, same keys (each section pairs it with English). */
export const swFromSections = pick('sw');
