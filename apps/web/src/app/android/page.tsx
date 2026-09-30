import type { Metadata } from 'next';
import Link from 'next/link';

import { getMessages, pageTitle } from '@/i18n/server';

export const generateMetadata = (): Promise<Metadata> =>
  pageTitle('androidApp');

/** The latest test build, published by CI (ADR 0025). */
const APK =
  'https://github.com/kuriamyg/contact-sphere/releases/download/android-latest/contact-sphere.apk';

/**
 * "Get the Android app": the one link to share with a friend while the app
 * is in testing (before Google Play).
 */
export default async function AndroidPage() {
  const t = (await getMessages()).auth.android;
  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-muted">{t.lead}</p>
      </div>
      <a
        href={APK}
        className="block rounded-2xl btn-primary px-4 py-4 text-center text-lg font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {t.download}
      </a>
      <ol className="list-decimal space-y-3 rounded-2xl card p-5 pl-9 text-sm">
        {t.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <p className="text-sm text-muted">{t.testing}</p>
      <p className="text-sm text-muted">
        {t.iphone}{' '}
        <Link
          href="/signup"
          className="font-medium text-accent hover:underline"
        >
          {t.useWeb}
        </Link>
      </p>
    </main>
  );
}
