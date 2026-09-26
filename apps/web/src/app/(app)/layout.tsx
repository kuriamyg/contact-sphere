import { cookies } from 'next/headers';
import Link from 'next/link';

import { OrbitMark } from '@/components/brand/orbit-mark';
import { NavLink } from '@/components/nav-link';
import { OfflineSync } from '@/components/offline/offline-sync';
import { BottomNav } from '@/components/shell/bottom-nav';
import { ProfileMenu } from '@/components/shell/profile-menu';
import { requireUser } from '@/lib/auth';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';

/** Everything under (app) requires a signed-in user, checked with the API on each request. */
export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await requireUser();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const name = user.displayName ?? user.email;
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <OfflineSync />
      <header className="sticky top-0 z-20 border-b border-border bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-2.5">
          <Link
            href="/today"
            className="flex items-center gap-2.5 rounded-xl font-semibold whitespace-nowrap focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <OrbitMark />
            <span className="font-display text-base tracking-tight">
              Contact Sphere
            </span>
          </Link>
          <div className="flex items-center gap-1 text-sm sm:gap-2">
            <nav
              aria-label="Sections"
              className="hidden items-center gap-1 sm:flex"
            >
              <NavLink href="/today">Today</NavLink>
              <NavLink href="/contacts">Contacts</NavLink>
              <NavLink href="/groups">Groups</NavLink>
            </nav>
            <ProfileMenu
              name={name}
              email={user.email}
              colourKey={user.id}
              theme={theme}
            />
          </div>
        </div>
      </header>
      <main
        id="main"
        className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-28 sm:py-8"
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
