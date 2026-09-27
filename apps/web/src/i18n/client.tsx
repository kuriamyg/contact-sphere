'use client';

import { createContext, useContext } from 'react';

import { en, type Messages } from './en';
import type { Locale } from './locales';

type ClientMessages = Messages['client'];

const Ctx = createContext<{ locale: Locale; m: ClientMessages }>({
  locale: 'en',
  m: en.client,
});

/** Gives client components their strings (only the client part is sent). */
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: ClientMessages;
  children: React.ReactNode;
}) {
  return (
    <Ctx.Provider value={{ locale, m: messages }}>{children}</Ctx.Provider>
  );
}

export const useMessages = () => useContext(Ctx).m;
export const useLocale = () => useContext(Ctx).locale;
