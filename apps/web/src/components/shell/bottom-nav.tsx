'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useMessages } from '@/i18n/client';

import { NavIcon as Icon } from './nav-icon';

const ITEMS = [
  { href: '/today', label: 'today', icon: 'today' },
  { href: '/contacts', label: 'contacts', icon: 'contacts' },
  { href: '/groups', label: 'groups', icon: 'groups' },
  { href: '/contacts?find=1', label: 'search', icon: 'search' },
] as const;

/** The phone's main navigation, where the thumb reaches. Hidden from sm up. */
export function BottomNav() {
  const pathname = usePathname();
  const t = useMessages().shell;
  const current = (href: string) => {
    if (href.includes('?')) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  };
  return (
    <nav
      aria-label={t.main}
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 grid h-16 grid-cols-4 items-center rounded-2xl card bg-[var(--bar)] shadow-[0_12px_40px_rgba(0,0,0,0.25)] backdrop-blur-md sm:hidden"
    >
      {ITEMS.map((i) => {
        const on = current(i.href);
        return (
          <Link
            key={i.label}
            href={i.href}
            data-tour={i.label}
            aria-current={on ? 'page' : undefined}
            className={`flex h-full flex-col items-center justify-center gap-1 rounded-2xl text-[11px] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
              on ? 'font-bold text-accent' : 'font-semibold text-muted'
            }`}
          >
            <Icon name={i.icon} />
            {t[i.label]}
          </Link>
        );
      })}
    </nav>
  );
}
