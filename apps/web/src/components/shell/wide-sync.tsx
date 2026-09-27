'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Must match lib/wide.ts and Tailwind's lg breakpoint. */
const COOKIE = 'cs-wide';
const QUERY = '(min-width: 1024px)';

/**
 * Tells the server whether this window is laptop-wide (cookie), and
 * re-renders once when that changes (first visit, or a resized window),
 * so the side-by-side list appears or goes away.
 */
export function WideSync({ wide }: { wide: boolean }) {
  const router = useRouter();
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const sync = () => {
      const now = mq.matches;
      const secure = location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${COOKIE}=${now ? '1' : '0'}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
      if (now !== wide) router.refresh();
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [wide, router]);
  return null;
}
