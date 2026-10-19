import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';

import { connectDB, UserModel } from '@/database';
import { AppError } from '@lib/errors';

import { readSession } from './session';

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'admin';
  avatarUrl?: string;
};

/**
 * The signed-in user, verified against the database (so deactivated or
 * deleted accounts lose access immediately, not when their cookie expires).
 * Memoized per request with React `cache`, so layouts and pages can all call
 * it without extra queries.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;

  await connectDB();
  const user = await UserModel.findById(session.sub).lean();
  if (!user || !user.isActive) return null;

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatarUrl: user.avatar?.url,
  };
});

/** For pages: send anonymous visitors to the login page, then back. */
export async function requireUserPage(returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

export async function requireAdminPage(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin');
  if (user.role !== 'admin') redirect('/');
  return user;
}

/** For server actions / route handlers: throw instead of redirecting. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError('Please sign in to continue.', 401);
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== 'admin') throw new AppError('You do not have permission to do that.', 403);
  return user;
}
