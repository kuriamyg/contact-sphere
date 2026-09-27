import { FormMessage } from '@/components/auth/field';
import { getMessages } from '@/i18n/server';

/**
 * One-line confirmations after an action, chosen by a fixed code in the URL
 * (?done=trashed). Only known codes show anything, so the URL cannot be
 * used to put arbitrary text on the page.
 */
export async function Notice({ code }: { code?: string | string[] }) {
  if (typeof code !== 'string') return null;
  const notices = (await getMessages()).notices;
  const n = Object.hasOwn(notices, code) ? notices[code] : undefined;
  return n ? <FormMessage {...n} /> : null;
}
