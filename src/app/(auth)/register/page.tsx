import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@lib/auth/current-user';
import { param, type SearchParams } from '@lib/search-params';

import { RegisterForm } from './components/register-form';

export const metadata: Metadata = { title: 'Create account', robots: { index: false } };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const next = param(await searchParams, 'next');
  if (await getCurrentUser()) redirect('/account');

  return (
    <>
      <h1 className="type-display text-ink">Create your account</h1>
      <p className="text-muted mt-2 text-sm">Track orders, save addresses and check out faster.</p>
      <RegisterForm next={next} />
      <p className="text-muted mt-8 text-center text-sm">
        Already have an account?{' '}
        <Link
          href={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="text-ink font-semibold underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
