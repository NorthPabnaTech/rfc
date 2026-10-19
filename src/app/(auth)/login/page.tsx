import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@lib/auth/current-user';
import { param, type SearchParams } from '@lib/search-params';

import { LoginForm } from './components/login-form';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const next = param(await searchParams, 'next');
  const user = await getCurrentUser();
  if (user)
    redirect(
      next?.startsWith('/') && !next.startsWith('//')
        ? next
        : user.role === 'admin'
          ? '/admin'
          : '/account',
    );

  return (
    <>
      <h1 className="type-display text-ink">Welcome back</h1>
      <p className="text-muted mt-2 text-sm">Sign in to your RFC Gadget account.</p>
      <LoginForm next={next} />
      <p className="text-muted mt-8 text-center text-sm">
        New to RFC Gadget?{' '}
        <Link
          href={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="text-ink font-semibold underline-offset-2 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
