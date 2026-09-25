import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/auth/login-form';
import { currentUser, setupAvailable } from '@/lib/auth';

export const metadata: Metadata = { title: 'Sign in · Contact Sphere' };

export default async function LoginPage() {
  if (await currentUser()) redirect('/account');
  const canSetUp = await setupAvailable();
  return (
    <>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted">Your contacts are private to your account.</p>
      </header>
      <LoginForm />
      {canSetUp && (
        <p className="text-sm text-muted">
          First time here?{' '}
          <Link href="/setup" className="font-medium text-foreground underline">
            Create the owner account
          </Link>
        </p>
      )}
    </>
  );
}
