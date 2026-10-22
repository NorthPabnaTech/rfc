'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { deletePushSubscription } from '@/services/notifications';
import {
  authenticate,
  registerCustomer,
  requestPasswordReset,
  resetPassword,
} from '@/services/users';
import { createSession, deleteSession } from '@lib/auth/session';
import { type ActionResult, runAction } from '@lib/errors';
import { PUSH_COOKIE } from '@lib/realtime/channels';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@lib/validators/auth';
import { objectId } from '@lib/validators/common';

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
    const { identifier, password } = loginSchema.parse(input);
    const user = await authenticate(identifier, password);
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

export async function forgotPasswordAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const { email } = forgotPasswordSchema.parse(input);
    await requestPasswordReset(email);
    return undefined;
  });
}

/** Sets the new password and signs the user in on this device. */
export async function resetPasswordAction(
  input: unknown,
): Promise<ActionResult<{ redirectTo: string }>> {
  return runAction(async () => {
    const user = await resetPassword(resetPasswordSchema.parse(input));
    await createSession(user);
    return { redirectTo: user.role === 'admin' ? '/admin' : '/account' };
  }, 'Password updated — you are signed in.');
}

export async function logoutAction(): Promise<void> {
  // Stop system notifications to this browser for the signed-out account.
  const store = await cookies();
  const pushId = store.get(PUSH_COOKIE)?.value;
  if (pushId && objectId.safeParse(pushId).success) {
    await deletePushSubscription(pushId).catch(() => {});
  }
  store.delete(PUSH_COOKIE);
  await deleteSession();
  redirect('/');
}
