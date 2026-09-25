import Link from 'next/link';

import { logout } from '@/app/actions/auth';
import { requireUser } from '@/lib/auth';

/** Everything under (app) requires a signed-in user, checked with the API on each request. */
export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await requireUser();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border">
        <nav
          aria-label="Main"
          className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3"
        >
          <Link href="/account" className="font-semibold">
            Contact Sphere
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">{user.email}</span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none"
              >
                Sign out
              </button>
            </form>
          </div>
        </nav>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
