import Link from 'next/link';

import { OrbitMark } from '@/components/brand/orbit-mark';
import { getLocale } from '@/i18n/server';

/**
 * Privacy policy and terms (B7): public, readable without an account, in
 * the app's own theme. The English text is the one that governs; readers
 * who chose Kiswahili see a Kiswahili summary first.
 */
export default async function LegalLayout({ children }: LayoutProps<'/'>) {
  const sw = (await getLocale()) === 'sw';
  return (
    <main
      id="main"
      className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14"
    >
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2.5 rounded-xl font-semibold focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <OrbitMark />
        <span className="font-display">Contact Sphere</span>
      </Link>
      <div className="legal">{children}</div>
      <nav
        aria-label={sw ? 'Faragha na masharti' : 'Privacy and terms'}
        className="mt-12 flex flex-wrap gap-4 border-t border-border pt-6 text-sm text-muted"
      >
        <Link href="/privacy" className="hover:text-foreground hover:underline">
          {sw ? 'Sera ya faragha' : 'Privacy policy'}
        </Link>
        <Link href="/terms" className="hover:text-foreground hover:underline">
          {sw ? 'Masharti ya matumizi' : 'Terms of use'}
        </Link>
        <Link href="/login" className="hover:text-foreground hover:underline">
          {sw ? 'Ingia' : 'Sign in'}
        </Link>
      </nav>
    </main>
  );
}
