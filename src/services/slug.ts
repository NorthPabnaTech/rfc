import 'server-only';

import type { Model } from 'mongoose';

import { AppError } from '@lib/errors';
import { slugify } from '@lib/slug';

/**
 * Returns `base`, or `base-2`, `base-3`… — the first slug not already used
 * by another document in `model` (ignoring `excludeId`, the doc being edited).
 */
export async function uniqueSlug(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>,
  source: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(source);
  if (!base) throw new AppError('Could not build a URL slug from that name.');

  for (let n = 1; n < 500; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const clash = await model.exists({
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    if (!clash) return candidate;
  }
  throw new AppError('Too many items share this name — please choose a different one.');
}
