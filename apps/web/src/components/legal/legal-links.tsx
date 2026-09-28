import Link from 'next/link';

import { getMessages } from '@/i18n/server';

/** Privacy · Terms, under the sign-in forms and on the home page. */
export async function LegalLinks() {
  const t = (await getMessages()).auth;
  const link =
    'underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none';
  return (
    <nav
      aria-label={t.legalLinks}
      className="flex justify-center gap-4 text-xs text-muted"
    >
      <Link href="/privacy" className={link}>
        {t.privacy}
      </Link>
      <Link href="/terms" className={link}>
        {t.terms}
      </Link>
    </nav>
  );
}
