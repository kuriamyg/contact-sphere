import type { Viewport } from 'next';
import Link from 'next/link';

import { ChromeRing } from '@/components/brand/chrome-ring';
import { OfflineGuard } from '@/components/offline/offline-sync';

/** The phone's status bar matches the black page. */
export const viewport: Viewport = { themeColor: '#000000' };

/**
 * Sign-in, first-account setup and the two-factor step share one look,
 * whatever theme is chosen elsewhere: black and chrome (see .auth-chrome in
 * globals.css). data-theme="dark" makes dark: utilities apply inside.
 */
export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div data-theme="dark" className="auth-chrome flex flex-1 flex-col">
      <main
        id="main"
        className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 py-12 [&>header]:text-center"
      >
        <div className="flex flex-col items-center gap-5">
          <Link
            href="/"
            className="text-xs font-semibold tracking-[0.2em] text-muted uppercase hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none"
          >
            Contact Sphere
          </Link>
          <span className="chrome-tile inline-flex size-28 items-center justify-center rounded-[30px]">
            <ChromeRing id="hero-ring" className="size-20" spin="slow" />
          </span>
        </div>
        {children}
        <OfflineGuard />
      </main>
    </div>
  );
}
