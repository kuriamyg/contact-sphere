'use client';

import { useEffect, useState, useTransition } from 'react';

import { contactsForPhone } from '@/app/actions/phone-copy';
import { FormMessage } from '@/components/auth/field';
import { useMessages } from '@/i18n/client';
import { fmt } from '@/i18n/format';
import {
  deniedPermission,
  phoneCopyCount,
  removeFromPhone,
  writeToPhone,
} from '@/lib/phone-copy';

const button =
  'rounded-lg border border-border px-4 py-2.5 text-sm font-medium bg-surface hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none disabled:opacity-60';

/**
 * Android app 0.3+ only (P5c, ADR 0025): put the owner's contacts in the
 * phone's own Contacts app, under a separate "Contact Sphere" account, or
 * take them off again. The owner's other phone contacts are never touched.
 */
export function PhoneCopySection() {
  const t = useMessages().phoneCopy;
  const [count, setCount] = useState<number | null>(null);
  const [done, setDone] = useState<string>();
  const [error, setError] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    phoneCopyCount().then(setCount, () => setCount(null));
  }, []);

  const fail = (e: unknown) =>
    setError(deniedPermission(e) ? t.denied : t.failed);

  const put = () => {
    setDone(undefined);
    setError(undefined);
    start(async () => {
      const res = await contactsForPhone();
      if ('error' in res) {
        setError(res.error);
        return;
      }
      try {
        const r = await writeToPhone(res.contacts);
        setDone(fmt(t.result, { ...r }));
        setCount(await phoneCopyCount());
      } catch (e) {
        fail(e);
      }
    });
  };

  const remove = () => {
    setConfirming(false);
    setDone(undefined);
    setError(undefined);
    start(async () => {
      try {
        const n = await removeFromPhone();
        setDone(fmt(t.removed, { n }));
        setCount(0);
      } catch (e) {
        fail(e);
      }
    });
  };

  return (
    <div className="space-y-3" data-testid="phone-copy">
      <p className="text-sm text-muted">{t.body}</p>
      {count !== null && count > 0 && (
        <p className="text-sm">{fmt(t.onPhone, { n: count })}</p>
      )}
      <FormMessage success={done} error={error} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={put}
          disabled={pending}
          className="rounded-lg btn-primary px-4 py-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
        >
          {pending ? t.working : count ? t.update : t.put}
        </button>
        {!!count &&
          (confirming ? (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
            >
              {t.removeConfirm}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={pending}
              className={button}
            >
              {t.remove}
            </button>
          ))}
      </div>
      <p className="text-xs text-muted">{t.safe}</p>
    </div>
  );
}
