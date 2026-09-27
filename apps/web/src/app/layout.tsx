import type { Metadata, Viewport } from 'next';
import { Manrope, Sora } from 'next/font/google';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import './globals.css';

import { RegisterServiceWorker } from '@/components/pwa/register-sw';
import { I18nProvider } from '@/i18n/client';
import { getLocale, getMessages } from '@/i18n/server';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';

// next/font downloads these at build time and serves them from our own
// origin, so visitors' browsers never contact Google.
// Aurora type: Sora for headings, Manrope for everything else.
const heading = Sora({
  variable: '--font-heading',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

const body = Manrope({
  variable: '--font-body',
  subsets: ['latin'],
});

/**
 * How long Vercel lets one request (page or Server Action) run. Stated, not
 * left to the plan default, which can be as short as 10 s: shorter than
 * Render's free instance takes to wake, so the platform would kill the
 * request and show a generic crash page. lib/api.ts gives up at 50 s, so
 * our own "try again" message always arrives before this limit.
 */
export const maxDuration = 60;

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages();
  return { ...metadata, description: m.meta.description };
}

const metadata: Metadata = {
  title: 'Contact Sphere',
  description: 'A private, privacy-first contact manager.',
  // A private application: keep every page out of search engines.
  robots: { index: false, follow: false },
  applicationName: 'Contact Sphere',
  appleWebApp: {
    capable: true,
    title: 'Contacts',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbf8f2' },
    { media: '(prefers-color-scheme: dark)', color: '#04050a' },
  ],
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // Every page renders per request, so each gets its own CSP nonce
  // (src/proxy.ts). A page built once at deploy time could not carry one.
  await connection();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const [locale, m] = await Promise.all([getLocale(), getMessages()]);
  return (
    <html
      lang={locale}
      data-theme={theme}
      className={`${heading.variable} ${body.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <div aria-hidden="true" className="cosmos" />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-background"
        >
          {m.common.skip}
        </a>
        <I18nProvider locale={locale} messages={m.client}>
          {children}
        </I18nProvider>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
