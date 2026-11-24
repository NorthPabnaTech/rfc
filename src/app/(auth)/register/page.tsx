import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { param, type SearchParams } from '@lib/search-params';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const next = param(await searchParams, 'next');
  redirect(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
}
