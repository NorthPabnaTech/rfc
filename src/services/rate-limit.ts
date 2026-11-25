import 'server-only';

import { createHash } from 'node:crypto';

import { headers } from 'next/headers';

import { connectDB, hitRateLimit } from '@/database';
import { RATE_LIMITS, type RateLimitBucket } from '@lib/constants';
import { AppError } from '@lib/errors';

/**
 * Client IP as reported by the hosting proxy (`x-real-ip`, else the first
 * `x-forwarded-for` hop). Falls back to a shared bucket when unknown.
 */
export function clientIpFrom(h: Headers): string {
  const real = h.get('x-real-ip')?.trim();
  if (real) return real;
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || 'unknown';
}

export async function requestIp(): Promise<string> {
  return clientIpFrom(await headers());
}

/**
 * Counts one attempt for each subject (e.g. IP, email) in `bucket` and throws
 * a 429 `AppError` once any of them is over its limit. Subjects are hashed so
 * no raw emails/IPs are stored.
 */
export async function enforceRateLimit(
  bucket: RateLimitBucket,
  ...subjects: (string | null | undefined)[]
): Promise<void> {
  const { limit, windowSeconds } = RATE_LIMITS[bucket];
  const keys = subjects
    .filter((s): s is string => Boolean(s))
    .map((s) => `${bucket}:${createHash('sha256').update(s.toLowerCase()).digest('base64url').slice(0, 22)}`);
  if (!keys.length) return;
  await connectDB();
  const counts = await Promise.all(keys.map((k) => hitRateLimit(k, windowSeconds)));
  if (counts.some((c) => c > limit)) {
    const minutes = Math.ceil(windowSeconds / 60);
    throw new AppError(
      `Too many attempts. Please wait up to ${minutes} minutes and try again.`,
      429,
    );
  }
}
