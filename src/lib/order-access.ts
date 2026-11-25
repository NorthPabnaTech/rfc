import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

import { cookies } from 'next/headers';

import { serverEnv } from '@lib/env';

/**
 * Proof that this browser placed an order, so the public
 * `/order-success/[orderNumber]` page can't be enumerated with sequential
 * order numbers. Holds the last few orders as `ORDER.signature` pairs.
 */
const ORDER_ACCESS_COOKIE = 'rfc_order_access';
const MAX_ORDERS = 10;
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days — enough to finish an online payment

function sign(orderNumber: string): string {
  return createHmac('sha256', serverEnv.AUTH_SECRET)
    .update(`order-access:${orderNumber.toUpperCase()}`)
    .digest('base64url');
}

function parse(raw: string | undefined): Map<string, string> {
  const entries = new Map<string, string>();
  for (const part of (raw ?? '').split(',')) {
    const [num, sig] = part.split('.');
    if (num && sig) entries.set(num.toUpperCase(), sig);
  }
  return entries;
}

/** Call from a Server Action right after the order is created. */
export async function grantOrderAccess(orderNumber: string): Promise<void> {
  const store = await cookies();
  const entries = parse(store.get(ORDER_ACCESS_COOKIE)?.value);
  const key = orderNumber.toUpperCase();
  entries.delete(key);
  entries.set(key, sign(key));
  const value = [...entries]
    .slice(-MAX_ORDERS)
    .map(([num, sig]) => `${num}.${sig}`)
    .join(',');
  store.set(ORDER_ACCESS_COOKIE, value, {
    httpOnly: true,
    secure: serverEnv.IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function hasOrderAccess(orderNumber: string): Promise<boolean> {
  const store = await cookies();
  const key = orderNumber.toUpperCase();
  const sig = parse(store.get(ORDER_ACCESS_COOKIE)?.value).get(key);
  if (!sig) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(key));
  return a.length === b.length && timingSafeEqual(a, b);
}
