'use server';

import { redirect } from 'next/navigation';

import { authenticate, registerCustomer } from '@/services/users';
import { createSession, deleteSession } from '@lib/auth/session';
import { type ActionResult, runAction } from '@lib/errors';
import { loginSchema, registerSchema } from '@lib/validators/auth';

/** Only allow same-site relative redirects after login (no open redirects). */
function safeNext(next: unknown, fallback: string): string {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//')
    ? next
    : fallback;
}

export async function loginAction(
  input: unknown,
  next?: string,
): Promise<ActionResult<{ redirectTo: string }>> {
  return runAction(async () => {
    const { email, password } = loginSchema.parse(input);
    const user = await authenticate(email, password);
    await createSession(user);
    const fallback = user.role === 'admin' ? '/admin' : '/account';
    return { redirectTo: safeNext(next, fallback) };
  });
}

export async function registerAction(
  input: unknown,
  next?: string,
): Promise<ActionResult<{ redirectTo: string }>> {
  return runAction(async () => {
    const data = registerSchema.parse(input);
    const user = await registerCustomer(data);
    await createSession(user);
    return { redirectTo: safeNext(next, '/account') };
  });
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect('/');
}
