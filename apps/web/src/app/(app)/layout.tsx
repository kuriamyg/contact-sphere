import { cookies } from 'next/headers';
import Link from 'next/link';

import { OrbitMark } from '@/components/brand/orbit-mark';
import { NavLink } from '@/components/nav-link';
import { EditClashes } from '@/components/offline/edit-clashes';
import { Tour } from '@/components/onboarding/tour';
import { OfflineSync } from '@/components/offline/offline-sync';
import { BottomNav } from '@/components/shell/bottom-nav';
import { ProfileMenu } from '@/components/shell/profile-menu';
import { Sidebar } from '@/components/shell/sidebar';
import { WideSync } from '@/components/shell/wide-sync';
import { isWide } from '@/lib/wide';
import { getMessages } from '@/i18n/server';
import { requireUser, whoIs } from '@/lib/auth';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';

/** Everything under (app) requires a signed-in user, checked with the API on each request. */
export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const [user, m] = await Promise.all([requireUser(), getMessages()]);
  const t = m.client.shell;
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const name = whoIs(user);
  return (
    <div className="flex min-h-full flex-1">
      <Sidebar name={name} colourKey={user.id} />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineSync />
        <WideSync wide={await isWide()} />
        <header className="sticky top-0 z-20 border-b border-border bg-background/75 backdrop-blur-xl lg:hidden">
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
                aria-label={t.sections}
                className="hidden items-center gap-1 sm:flex"
              >
                <NavLink href="/today" tour="today">
                  {t.today}
                </NavLink>
                <NavLink href="/contacts" tour="contacts">
                  {t.contacts}
                </NavLink>
                <NavLink href="/groups" tour="groups">
                  {t.groups}
                </NavLink>
              </nav>
              <ProfileMenu
                name={name}
                email={user.email ?? user.phone ?? ''}
                operator={user.operator ?? false}
                colourKey={user.id}
                theme={theme}
              />
            </div>
          </div>
        </header>
        <main
          id="main"
          className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-28 sm:py-8 lg:max-w-7xl lg:px-10 lg:py-10"
        >
          <EditClashes ownerId={user.id} />
          {children}
        </main>
        <BottomNav />
        <Tour userId={user.id} createdAt={user.createdAt} name={name} />
      </div>
    </div>
  );
}
