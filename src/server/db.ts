import 'server-only';

import type { ClientSession } from 'mongoose';

import { nextSequence } from '@/database/models/counter';

export { connectDB, withTransaction } from '@/database/connect';

export type Session = ClientSession | undefined;

/**
 * Human-readable sequential ids: ORD-10001, TXN-500001, WDR-30001…
 * (counters live in the `counters` collection; gaps after an aborted
 * transaction are harmless).
 */
export async function nextId(prefix: string, offset: number): Promise<string> {
  return `${prefix}-${await nextSequence(`resell:${prefix}`, offset)}`;
}
