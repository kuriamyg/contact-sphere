import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { SetupForm } from '@/components/auth/setup-form';
import { setupAvailable } from '@/lib/auth';

export const metadata: Metadata = { title: 'Set up · Contact Sphere' };

/** Exists only until the first account is created (ADR 0004, 0006). */
export default async function SetupPage() {
  if (!(await setupAvailable())) redirect('/login');
  return (
    <>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create the owner account
        </h1>
        <p className="text-muted">
          This page works once. After the first account exists, it closes for
          good.
        </p>
      </header>
      <SetupForm />
    </>
  );
}
