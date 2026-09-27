'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useMessages } from '@/i18n/client';

const ITEMS = [
  { href: '/today', label: 'today', icon: 'today' },
  { href: '/contacts', label: 'contacts', icon: 'contacts' },
  { href: '/groups', label: 'groups', icon: 'groups' },
  { href: '/contacts?find=1', label: 'search', icon: 'search' },
] as const;

function Icon({ name }: { name: (typeof ITEMS)[number]['icon'] }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  } as const;
  switch (name) {
    case 'today':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
        </svg>
      );
    case 'contacts':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
    case 'groups':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M21 20a6 6 0 0 0-4-5.6" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      );
  }
}

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
