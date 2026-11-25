'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { SITE } from '@/config/site';
import { deletePushSubscription } from '@/services/notifications';
import { enforceRateLimit, requestIp } from '@/services/rate-limit';
import {
  authenticate,
  registerCustomer,
  requestPasswordReset,
  resetPassword,
} from '@/services/users';
import { createSession, deleteSession } from '@lib/auth/session';
import { type ActionResult, runAction } from '@lib/errors';
import { PUSH_COOKIE } from '@lib/realtime/channels';
import { safeRedirectPath } from '@lib/safe-redirect';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@lib/validators/auth';
import { objectId } from '@lib/validators/common';

/** Only allow same-site relative redirects after login (no open redirects). */
function safeNext(next: unknown, fallback: string): string {
  return safeRedirectPath(next) ?? fallback;
}

export async function loginAction(
  input: unknown,
  next?: string,
): Promise<ActionResult<{ redirectTo: string }>> {
  return runAction(async () => {
    const { identifier, password } = loginSchema.parse(input);
    await enforceRateLimit(
      'login',
      `ip:${await requestIp()}`,
      `id:${identifier.email ?? identifier.phone}`,
    );
    const user = await authenticate(identifier, password);
    await createSession(user);
    const fallback = user.role === 'admin' ? '/admin' : '/account';
    return { redirectTo: safeNext(next, fallback) };
  });
}

/**
 * Base URL for links in emails (verify / reset). Always the configured site
 * URL, never request headers: Origin / Host / X-Forwarded-Host are
 * attacker-controlled and would let a reset token be mailed to their domain.
 */
function getLinkOrigin(): string {
  return SITE.url.replace(/\/+$/, '');
}

export async function registerAction(
  input: unknown,
): Promise<ActionResult<{ email: string }>> {
  return runAction(async () => {
    const data = registerSchema.parse(input);
    await enforceRateLimit('register', `ip:${await requestIp()}`, `email:${data.email}`);
    const origin = getLinkOrigin();
    const user = await registerCustomer(data, origin);
    return { email: user.email };
  });
}

export async function forgotPasswordAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const { email } = forgotPasswordSchema.parse(input);
    await enforceRateLimit('forgotPassword', `ip:${await requestIp()}`, `email:${email}`);
    const origin = getLinkOrigin();
    await requestPasswordReset(email, origin);
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
