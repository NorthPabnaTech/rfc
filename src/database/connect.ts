import 'server-only';

import dns from 'node:dns';

import mongoose from 'mongoose';

import { serverEnv } from '@lib/env';

/**
 * One shared Mongoose connection per server process.
 *
 * In development Next.js re-evaluates modules on every edit, so the
 * connection promise is parked on `globalThis` — otherwise each hot reload
 * would open a new pool and Atlas would eventually refuse connections.
 */
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const globalForMongoose = globalThis as unknown as { __mongoose?: Cache };
const cache: Cache = globalForMongoose.__mongoose ?? { conn: null, promise: null };
globalForMongoose.__mongoose = cache;

mongoose.set('strictQuery', true);

const PUBLIC_DNS = ['1.1.1.1', '8.8.8.8'];

/**
 * `mongodb+srv://` URIs need a DNS SRV lookup, which Node does with its own
 * resolver. On some machines that resolver is pointed at an unreachable
 * local proxy (e.g. 127.0.0.1 left behind by a VPN), so the lookup is
 * refused even though the OS resolves fine. Detect that case.
 */
function isSrvLookupFailure(error: unknown): boolean {
  const e = error as { code?: string; syscall?: string; message?: string };
  return (
    (e?.syscall === 'querySrv' || /querySrv/.test(e?.message ?? '')) &&
    ['ECONNREFUSED', 'ETIMEOUT', 'ESERVFAIL'].includes(e?.code ?? '')
  );
}

async function connect(): Promise<typeof mongoose> {
  const options = {
    dbName: serverEnv.MONGODB_DB,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10_000,
  };
  try {
    return await mongoose.connect(serverEnv.MONGODB_URI, options);
  } catch (error) {
    if (!isSrvLookupFailure(error)) throw error;
    console.warn(
      `[db] SRV lookup failed via ${dns.getServers().join(', ')}; retrying with public DNS resolvers.`,
    );
    dns.setServers(PUBLIC_DNS);
    return mongoose.connect(serverEnv.MONGODB_URI, options);
  }
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  cache.promise ??= connect().catch((error: unknown) => {
    // Let the next request retry instead of caching a rejected promise.
    cache.promise = null;
    throw error;
  });

  cache.conn = await cache.promise;
  return cache.conn;
}
