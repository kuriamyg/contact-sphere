import Link from 'next/link';

import { OrbitMark } from '@/components/brand/orbit-mark';
import { OfflineGuard } from '@/components/offline/offline-sync';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 py-12"
    >
      <Link
        href="/"
        className="flex items-center gap-2.5 self-start rounded-xl font-display font-semibold focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <OrbitMark className="size-10" />
        Contact Sphere
      </Link>
      {children}
      <OfflineGuard />
    </main>
  );
}
