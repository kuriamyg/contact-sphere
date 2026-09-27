'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { logout } from '@/app/actions/auth';
import { Avatar } from '@/components/avatar';
import {
  BellIcon,
  DownloadIcon,
  LogOutIcon,
  MergeIcon,
  QrIcon,
  TagIcon,
  UploadIcon,
  UserIcon,
} from '@/components/icons';
import { WipeOnSubmit } from '@/components/offline/offline-toggle';
import { useMessages } from '@/i18n/client';
import { fmt } from '@/i18n/format';
import type { Theme } from '@/lib/theme';

import { LanguageSwitch } from './language-switch';
import { ThemeSwitch } from './theme-switch';

const item =
  'flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none';

/**
 * The avatar's dropdown: account pages, tools, appearance and sign-out.
 * A disclosure (button + panel), closed by Escape, a tap outside, or
 * moving to another page.
 */
export function ProfileMenu({
  name,
  email,
  colourKey,
  theme,
}: {
  name: string;
  email: string;
  colourKey: string;
  theme: Theme;
}) {
  const t = useMessages().shell;
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Close when the page changes.
  const [seen, setSeen] = useState(pathname);
  if (seen !== pathname) {
    setSeen(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="profile-menu"
        aria-label={fmt(t.menuFor, { name })}
        onClick={() => setOpen((o) => !o)}
        className={`rounded-full focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none ${
          open
            ? 'ring-2 ring-accent/60 ring-offset-2 ring-offset-background'
            : ''
        }`}
      >
        <Avatar name={name} colourKey={colourKey} />
      </button>
      {open && (
        <div
          id="profile-menu"
          className="absolute right-0 z-30 mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-background p-2 shadow-[0_24px_60px_rgba(0,0,0,0.45)] dark:bg-[#0c0e1a]"
        >
          <div className="flex items-center gap-3 p-3">
            <Avatar name={name} colourKey={colourKey} />
            <div className="min-w-0">
              <p className="truncate font-bold">{name}</p>
              {email !== name && (
                <p className="truncate text-sm text-muted">{email}</p>
              )}
            </div>
          </div>
          <div className="mx-2 my-1 h-px bg-border" />
          <nav aria-label={t.accountTools} className="flex flex-col">
            <Link href="/account" className={item}>
              <UserIcon className="size-[18px] text-accent" />
              {t.profile}
            </Link>
            <Link href="/card" className={item}>
              <QrIcon className="size-[18px] text-sky-500" />
              {t.card}
            </Link>
            <Link href="/account#reminders-heading" className={item}>
              <BellIcon className="size-[18px] text-amber-500" />
              {t.reminders}
            </Link>
            <Link href="/contacts/tags" className={item}>
              <TagIcon className="size-[18px] text-violet" />
              {t.tags}
            </Link>
            <Link href="/contacts/duplicates" className={item}>
              <MergeIcon className="size-[18px] text-pink-500" />
              {t.duplicates}
            </Link>
            <Link href="/contacts/import" className={item}>
              <UploadIcon className="size-[18px] text-muted" />
              {t.import}
            </Link>
            <a href="/contacts/export" download className={item}>
              <DownloadIcon className="size-[18px] text-muted" />
              {t.export}
            </a>
          </nav>
          <div className="mx-2 my-1 h-px bg-border" />
          <div className="space-y-2 px-3 pt-2 pb-2">
            <p className="text-xs font-bold tracking-wider text-muted uppercase">
              {t.appearance}
            </p>
            <ThemeSwitch initial={theme} />
            <p className="pt-2 text-xs font-bold tracking-wider text-muted uppercase">
              {t.language}
            </p>
            <LanguageSwitch />
          </div>
          <div className="mx-2 my-1 h-px bg-border" />
          <WipeOnSubmit>
            <form action={logout}>
              <button
                type="submit"
                className={`${item} w-full text-red-700 dark:text-red-300`}
              >
                <LogOutIcon className="size-[18px]" />
                {t.signOut}
              </button>
            </form>
          </WipeOnSubmit>
        </div>
      )}
    </div>
  );
}
