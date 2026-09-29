import type { Metadata } from 'next';

import { AppSignIn } from '@/components/auth/app-sign-in';

export const metadata: Metadata = { title: 'Contact Sphere' };

/**
 * Inside the Android app: the app opens this page with the hand-off code
 * and its secret in the URL fragment, which never reaches any server log.
 * The page trades them for a session (ADR 0025).
 */
export default function AppSignInPage() {
  return <AppSignIn />;
}
