import Link from 'next/link';

import { OfflineGuard } from '@/components/offline/offline-sync';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 py-12"
    >
      <Link href="/" className="text-sm font-medium text-muted hover:underline">
        ← Contact Sphere
      </Link>
      {children}
      <OfflineGuard />
    </main>
  );
}
