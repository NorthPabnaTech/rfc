import 'server-only';

import { AppError } from '@lib/errors';

type BucketKey = 'products_min' | 'orders_min' | 'orders_hour';

const LIMITS: Record<BucketKey, { max: number; windowMs: number }> = {
  products_min: { max: 110, windowMs: 60_000 }, // 120/min API limit with safety margin
  orders_min: { max: 18, windowMs: 60_000 }, // 20/min API limit with safety margin
  orders_hour: { max: 280, windowMs: 3_600_000 }, // 300/hr API limit with safety margin
};

const timestamps = new Map<string, number[]>();

/**
 * Sliding-window rate-limit guard per supplier + operation bucket.
 * Throws a user-friendly 429 AppError rather than exceeding supplier quotas.
 */
export function assertRateLimit(supplierKey: string, buckets: BucketKey[]): void {
  const now = Date.now();
  for (const bucket of buckets) {
    const cfg = LIMITS[bucket];
    const mapKey = `${supplierKey}:${bucket}`;
    const list = (timestamps.get(mapKey) ?? []).filter((t) => now - t < cfg.windowMs);
    if (list.length >= cfg.max) {
      throw new AppError(
        `Supplier API rate limit reached (${bucket}). Please wait a moment and try again.`,
        429,
      );
    }
    list.push(now);
    timestamps.set(mapKey, list);
  }
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
