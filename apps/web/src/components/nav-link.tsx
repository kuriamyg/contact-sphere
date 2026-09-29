'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** A header link that marks itself as the current section. */
export function NavLink({
  href,
  children,
  tour,
}: {
  href: string;
  children: string;
  /** Where the first-run tour points (data-tour). */
  tour?: string;
}) {
  const pathname = usePathname();
  const current = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      data-tour={tour}
      aria-current={current ? 'page' : undefined}
      className={`rounded-lg px-3 py-1.5 hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
        current ? 'bg-accent-soft font-semibold text-foreground' : 'text-muted'
      }`}
    >
      {children}
    </Link>
  );
}
