'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { logout } from '@/app/actions/auth';
import { Avatar } from '@/components/avatar';
import {
  BellIcon,
  ChevronRightIcon,
  CloseIcon,
  DownloadIcon,
  LogOutIcon,
  MergeIcon,
  QrIcon,
  ShieldIcon,
  SparkleIcon,
  TagIcon,
  UploadIcon,
} from '@/components/icons';
import { WipeOnSubmit } from '@/components/offline/offline-toggle';
import { useMessages } from '@/i18n/client';
import { fmt } from '@/i18n/format';
import type { Theme } from '@/lib/theme';

import { LanguageSwitch } from './language-switch';
import { ThemeSwitch } from './theme-switch';

import { startTour } from '../onboarding/tour-events';

const item =
  'flex h-14 items-center gap-3.5 px-4 text-base font-semibold hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent focus-visible:outline-none';
const group =
  'divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface';
const chevron = <ChevronRightIcon className="ml-auto size-4 text-muted" />;

/**
 * The avatar opens the account screen: a full-screen page (not a small
 * dropdown) with account pages, tools, appearance, language and sign-out.
 * A modal dialog: the page behind does not scroll; Escape, the close
 * button, or moving to another page closes it and focus returns to the
 * avatar.
 */
export function ProfileMenu({
  name,
  email,
  colourKey,
  theme,
  operator = false,
}: {
  name: string;
  email: string;
  operator?: boolean;
  colourKey: string;
  theme: Theme;
}) {
  const t = useMessages().shell;
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Close when the page changes.
  const [seen, setSeen] = useState(pathname);
  if (seen !== pathname) {
    setSeen(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const avatar = button.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = 'hidden';
    close.current?.focus();
    document.addEventListener('keydown', onKey);
    return () => {
      html.style.overflow = before;
      document.removeEventListener('keydown', onKey);
      avatar?.focus();
    };
  }, [open]);

  return (
    <div>
      <button
        ref={button}
        type="button"
        data-tour="account"
        aria-expanded={open}
        aria-controls="profile-menu"
        aria-label={fmt(t.menuFor, { name })}
        onClick={() => setOpen(true)}
        className="rounded-full focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <Avatar name={name} colourKey={colourKey} />
      </button>
      {/* A portal: the header's backdrop blur would trap a fixed panel
          inside the header's box. */}
      {open &&
        createPortal(
          <div
            id="profile-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-menu-title"
            className="sheet-in fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-background"
          >
            <div className="mx-auto flex min-h-full max-w-lg flex-col gap-5 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between">
                <h2
                  id="profile-menu-title"
                  className="font-display text-lg font-semibold tracking-tight"
                >
                  {t.account}
                </h2>
                <button
                  ref={close}
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t.close}
                  className="flex size-11 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                >
                  <CloseIcon className="size-5" />
                </button>
              </div>

              <Link
                href="/account"
                className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              >
                <Avatar name={name} colourKey={colourKey} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-bold">
                    {name}
                  </span>
                  {email && email !== name && (
                    <span className="block truncate text-sm text-muted">
                      {email}
                    </span>
                  )}
                  <span className="mt-0.5 block text-sm font-semibold text-accent">
                    {t.profile}
                  </span>
                </span>
                {chevron}
              </Link>

              <nav aria-label={t.accountTools} className="space-y-5">
                <div className={group}>
                  <Link href="/card" className={item}>
                    <QrIcon className="size-5 text-sky-500" />
                    {t.card}
                    {chevron}
                  </Link>
                  <Link href="/account#reminders-heading" className={item}>
                    <BellIcon className="size-5 text-amber-500" />
                    {t.reminders}
                    {chevron}
                  </Link>
                </div>
                <div>
                  <p className="px-1 pb-2 text-xs font-bold tracking-wider text-muted uppercase">
                    {t.tools}
                  </p>
                  <div className={group}>
                    <Link href="/contacts/import" className={item}>
                      <UploadIcon className="size-5 text-emerald-500" />
                      {t.import}
                      {chevron}
                    </Link>
                    <a href="/contacts/export" download className={item}>
                      <DownloadIcon className="size-5 text-emerald-500" />
                      {t.export}
                      {chevron}
                    </a>
                    <Link href="/contacts/tags" className={item}>
                      <TagIcon className="size-5 text-violet" />
                      {t.tags}
                      {chevron}
                    </Link>
                    <Link href="/contacts/duplicates" className={item}>
                      <MergeIcon className="size-5 text-pink-500" />
                      {t.duplicates}
                      {chevron}
                    </Link>
                    {operator && (
                      <Link href="/operator" className={item}>
                        <ShieldIcon className="size-5 text-emerald-500" />
                        {t.operator}
                        {chevron}
                      </Link>
                    )}
                  </div>
                </div>
              </nav>

              <div className="space-y-2">
                <p className="px-1 text-xs font-bold tracking-wider text-muted uppercase">
                  {t.appearance}
                </p>
                <ThemeSwitch initial={theme} />
                <p className="px-1 pt-3 text-xs font-bold tracking-wider text-muted uppercase">
                  {t.language}
                </p>
                <LanguageSwitch />
              </div>

              <div className={group}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    startTour();
                  }}
                  className={`${item} w-full`}
                >
                  <SparkleIcon className="size-5 text-accent" />
                  {t.tour}
                  {chevron}
                </button>
                <WipeOnSubmit>
                  <form action={logout}>
                    <button
                      type="submit"
                      className={`${item} w-full text-red-700 dark:text-red-300`}
                    >
                      <LogOutIcon className="size-5" />
                      {t.signOut}
                    </button>
                  </form>
                </WipeOnSubmit>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
