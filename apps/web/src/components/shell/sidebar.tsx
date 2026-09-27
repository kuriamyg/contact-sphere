'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Avatar } from '@/components/avatar';
import { OrbitMark } from '@/components/brand/orbit-mark';
import { MergeIcon, QrIcon, TagIcon, UploadIcon } from '@/components/icons';
import { useMessages } from '@/i18n/client';

import { NavIcon, type NavIconName } from './nav-icon';

const MAIN: { href: string; label: 'today' | 'contacts' | 'groups' }[] = [
  { href: '/today', label: 'today' },
  { href: '/contacts', label: 'contacts' },
  { href: '/groups', label: 'groups' },
];

const row =
  'flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none';

/**
 * The laptop navigation (from 1024 px): sections, a search box, tools and
 * the owner's own card, which opens Profile & settings. Phones keep the
 * header and bottom bar instead.
 */
export function Sidebar({
  name,
  colourKey,
}: {
  name: string;
  colourKey: string;
}) {
  const t = useMessages().shell;
  const pathname = usePathname();
  const on = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const tools = [
    {
      href: '/contacts/import',
      label: t.import,
      icon: <UploadIcon className="size-[18px]" />,
    },
    {
      href: '/contacts/duplicates',
      label: t.duplicates,
      icon: <MergeIcon className="size-[18px]" />,
    },
    {
      href: '/contacts/tags',
      label: t.tags,
      icon: <TagIcon className="size-[18px]" />,
    },
    { href: '/card', label: t.card, icon: <QrIcon className="size-[18px]" /> },
  ];
  const accountOn = on('/account');
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-border bg-[var(--bar)] px-4 py-5 backdrop-blur-xl lg:flex">
      <Link
        href="/today"
        className="flex items-center gap-2.5 rounded-xl px-2 font-semibold focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <OrbitMark />
        <span className="font-display text-base tracking-tight">
          Contact Sphere
        </span>
      </Link>

      <form action="/contacts" role="search">
        <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-muted focus-within:ring-2 focus-within:ring-accent">
          <NavIcon name="search" size={16} />
          <span className="sr-only">{t.search}</span>
          <input
            type="search"
            name="q"
            maxLength={100}
            placeholder={t.searchPlaceholder}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
          />
        </label>
      </form>

      <nav aria-label={t.main} className="flex flex-col gap-0.5">
        {MAIN.map((i) => {
          const current =
            on(i.href) &&
            !(
              i.href === '/contacts' &&
              pathname.startsWith('/contacts/') &&
              tools.some((x) => pathname.startsWith(x.href))
            );
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={current ? 'page' : undefined}
              className={`${row} ${current ? 'bg-accent-soft text-foreground' : 'text-muted hover:bg-surface-hover hover:text-foreground'}`}
            >
              <span className={current ? 'text-accent' : ''}>
                <NavIcon name={i.label as NavIconName} size={18} />
              </span>
              {t[i.label]}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-0.5">
        <p className="px-3 pb-1 text-xs font-bold tracking-wider text-muted uppercase">
          {t.tools}
        </p>
        {tools.map((x) => {
          const current = on(x.href);
          return (
            <Link
              key={x.href}
              href={x.href}
              aria-current={current ? 'page' : undefined}
              className={`${row} ${current ? 'bg-accent-soft text-foreground' : 'text-muted hover:bg-surface-hover hover:text-foreground'}`}
            >
              {x.icon}
              {x.label}
            </Link>
          );
        })}
      </div>

      <Link
        href="/account"
        aria-current={accountOn ? 'page' : undefined}
        className={`mt-auto flex items-center gap-3 rounded-2xl border p-2.5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
          accountOn
            ? 'border-accent/40 bg-accent-soft'
            : 'border-border bg-surface hover:bg-surface-hover'
        }`}
      >
        <Avatar name={name} colourKey={colourKey} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold">{name}</span>
          <span className="block truncate text-xs text-muted">
            {t.profileSettings}
          </span>
        </span>
      </Link>
    </aside>
  );
}
