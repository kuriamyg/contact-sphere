import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { connection } from 'next/server';
import './globals.css';

import { RegisterServiceWorker } from '@/components/pwa/register-sw';

// next/font downloads these at build time and serves them from our own
// origin, so visitors' browsers never contact Google.
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
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

export const metadata: Metadata = {
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
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0d12' },
  ],
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // Every page renders per request, so each gets its own CSP nonce
  // (src/proxy.ts). A page built once at deploy time could not carry one.
  await connection();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-background"
        >
          Skip to content
        </a>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
