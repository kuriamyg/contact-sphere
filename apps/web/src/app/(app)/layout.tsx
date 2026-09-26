import Link from 'next/link';

import { Avatar } from '@/components/avatar';
import { NavLink } from '@/components/nav-link';
import { requireUser } from '@/lib/auth';

/** Everything under (app) requires a signed-in user, checked with the API on each request. */
export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await requireUser();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <nav
          aria-label="Main"
          className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-2.5"
        >
          <Link
            href="/contacts"
            className="flex items-center gap-2 font-semibold whitespace-nowrap"
          >
            <span
              aria-hidden="true"
              className="inline-flex size-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-background"
            >
              CS
            </span>
            <span className="hidden sm:inline">Contact Sphere</span>
          </Link>
          <div className="flex items-center gap-1 text-sm sm:gap-2">
            <NavLink href="/today">Today</NavLink>
            <NavLink href="/contacts">Contacts</NavLink>
            <NavLink href="/groups">Groups</NavLink>
            <Link
              href="/account"
              aria-label={`Profile and settings for ${user.displayName ?? user.email}`}
              className="rounded-full focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Avatar
                name={user.displayName ?? user.email}
                colourKey={user.id}
              />
            </Link>
          </div>
        </nav>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
