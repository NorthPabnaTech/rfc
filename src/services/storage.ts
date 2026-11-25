import 'server-only';

import mongoose from 'mongoose';

import { connectDB } from '@/database';
import { type CloudinaryUsageSnapshot, getCloudinaryUsage } from '@lib/cloudinary';

const DEFAULT_MONGO_LIMIT_MB = 512;

export type MongoUsageSnapshot = {
  dbName: string;
  dataSizeBytes: number;
  storageSizeBytes: number;
  indexSizeBytes: number;
  totalSizeBytes: number;
  limitBytes: number;
  collections: number;
  objects: number;
};

export type StorageUsageDTO = {
  cloudinary:
    | { ok: true; data: CloudinaryUsageSnapshot }
    | { ok: false; error: string };
  mongodb:
    | { ok: true; data: MongoUsageSnapshot }
    | { ok: false; error: string };
};

function resolveMongoLimitBytes(): number {
  const raw = Number(process.env.MONGODB_STORAGE_LIMIT_MB);
  const mb = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MONGO_LIMIT_MB;
  return mb * 1024 * 1024;
}

async function fetchMongoUsage(): Promise<MongoUsageSnapshot> {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection is not ready.');
  }
  const stats = await db.stats();
  const dataSizeBytes = Number(stats.dataSize ?? 0);
  const storageSizeBytes = Number(stats.storageSize ?? 0);
  const indexSizeBytes = Number(stats.indexSize ?? 0);
  const totalSizeBytes = Number(stats.totalSize ?? storageSizeBytes + indexSizeBytes);

  return {
    dbName: String(stats.db ?? db.databaseName),
    dataSizeBytes,
    storageSizeBytes,
    indexSizeBytes,
    totalSizeBytes,
    limitBytes: resolveMongoLimitBytes(),
    collections: Number(stats.collections ?? 0),
    objects: Number(stats.objects ?? 0),
  };
}

export async function getStorageUsage(): Promise<StorageUsageDTO> {
  const [cloudinaryRes, mongoRes] = await Promise.allSettled([
    getCloudinaryUsage(),
    fetchMongoUsage(),
  ]);

  return {
    cloudinary:
      cloudinaryRes.status === 'fulfilled'
        ? { ok: true, data: cloudinaryRes.value }
        : {
            ok: false,
            error:
              cloudinaryRes.reason instanceof Error
                ? cloudinaryRes.reason.message
                : 'Failed to load Cloudinary usage.',
          },
    mongodb:
      mongoRes.status === 'fulfilled'
        ? { ok: true, data: mongoRes.value }
        : {
            ok: false,
            error:
              mongoRes.reason instanceof Error
                ? mongoRes.reason.message
                : 'Failed to load MongoDB stats.',
          },
  };
}
