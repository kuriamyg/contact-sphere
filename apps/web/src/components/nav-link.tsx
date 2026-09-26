'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** A header link that marks itself as the current section. */
export function NavLink({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  const pathname = usePathname();
  const current = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={current ? 'page' : undefined}
      className={`rounded-lg px-3 py-1.5 hover:bg-surface focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none ${
        current ? 'font-medium text-foreground' : 'text-muted'
      }`}
    >
      {children}
    </Link>
  );
}
