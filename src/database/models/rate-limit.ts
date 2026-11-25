import { type Model, Schema } from 'mongoose';

import { defineModel } from './shared';

/** One fixed-window counter per `<bucket>:<subject>:<window>` key. */
interface RateLimit {
  _id: string;
  count: number;
  expiresAt: Date;
}

const rateLimitSchema = new Schema<RateLimit>(
  {
    _id: { type: String, required: true },
    count: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);
// MongoDB removes a window's counter once it has expired.
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimitModel: Model<RateLimit> = defineModel<RateLimit>(
  'RateLimit',
  rateLimitSchema,
);

/**
 * Adds one hit to `key` for the current `windowSeconds` window and returns
 * the hit count so far (including this one).
 */
export async function hitRateLimit(key: string, windowSeconds: number): Promise<number> {
  const windowMs = windowSeconds * 1000;
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const doc = await RateLimitModel.findOneAndUpdate(
    { _id: `${key}:${windowStart}` },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowStart + windowMs) } },
    { upsert: true, returnDocument: 'after' },
  ).lean();
  return doc?.count ?? 1;
}
