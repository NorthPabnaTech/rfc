'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import type { StorageUsageDTO } from '@/services/storage';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { cn } from '@lib/utils';

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, exp);
  return `${val >= 100 || exp === 0 ? val.toFixed(0) : val.toFixed(2)} ${units[exp]}`;
}

function Meter({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const barColor =
    clamped >= 90
      ? 'bg-[var(--status-danger-fg)]'
      : clamped >= 75
        ? 'bg-[var(--status-warn-fg)]'
        : 'bg-brand';

  return (
    <div className="bg-surface h-2 w-full overflow-hidden rounded-full">
      <div
        className={cn('h-full rounded-full transition-all duration-300', barColor)}
        style={{ width: `${Math.max(clamped, clamped > 0 ? 2 : 0)}%` }}
      />
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted">{label}</span>
      <span className="text-ink font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function StorageUsageCard({ usage }: { usage: StorageUsageDTO }) {
  const router = useRouter();
  const [refreshing, startTransition] = React.useTransition();

  return (
    <aside className="bg-panel hairline rounded-xl2 space-y-5 p-5 xl:sticky xl:top-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name="bar" size={16} className="text-brand" />
          <h2 className="text-ink text-xs font-bold tracking-[0.14em] uppercase">
            Storage &amp; Usage
          </h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={refreshing}
          onClick={() => startTransition(() => router.refresh())}
          className="h-7 px-2 text-xs"
        >
          <Icon name="refresh" size={13} className={refreshing ? 'animate-spin' : undefined} />
          Refresh
        </Button>
      </div>

      {/* Cloudinary */}
      <div className="border-line space-y-3 border-t pt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon name="image" size={15} className="text-muted" />
            <span className="text-ink text-sm font-semibold">Cloudinary</span>
          </div>
          {usage.cloudinary.ok && (
            <span className="bg-surface text-muted rounded-full px-2 py-0.5 text-[11px] font-medium">
              {usage.cloudinary.data.plan}
            </span>
          )}
        </div>

        {usage.cloudinary.ok ? (
          (() => {
            const c = usage.cloudinary.data;
            const hasCredits = c.creditsUsed !== null && c.creditsLimit !== null;
            const hasStorageLimit = c.storageLimitBytes !== null && c.storageLimitBytes > 0;
            const pct = hasCredits
              ? (c.creditsUsed! / c.creditsLimit!) * 100
              : hasStorageLimit
                ? (c.storageUsedBytes / c.storageLimitBytes!) * 100
                : 0;

            return (
              <div className="space-y-2.5">
                {hasCredits && (
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted">Monthly credits</span>
                      <span className="text-ink font-semibold tabular-nums">
                        {c.creditsUsed!.toFixed(2)} / {c.creditsLimit} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <Meter pct={pct} />
                    <p className="text-subtle text-[11px]">
                      Remaining: {Math.max(0, c.creditsLimit! - c.creditsUsed!).toFixed(2)} credits
                      (1 credit = 1 GB storage or bandwidth)
                    </p>
                  </div>
                )}

                {!hasCredits && hasStorageLimit && (
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted">Storage</span>
                      <span className="text-ink font-semibold tabular-nums">
                        {formatBytes(c.storageUsedBytes)} / {formatBytes(c.storageLimitBytes!)}
                      </span>
                    </div>
                    <Meter pct={pct} />
                    <p className="text-subtle text-[11px]">
                      Free: {formatBytes(Math.max(0, c.storageLimitBytes! - c.storageUsedBytes))}
                    </p>
                  </div>
                )}

                <div className="bg-surface/60 space-y-1.5 rounded-lg p-3">
                  <StatRow label="Storage used" value={formatBytes(c.storageUsedBytes)} />
                  <StatRow label="Bandwidth (30d)" value={formatBytes(c.bandwidthUsedBytes)} />
                  <StatRow label="Transformations" value={c.transformationsUsed.toLocaleString()} />
                  <StatRow label="Total files" value={c.objectsCount.toLocaleString()} />
                </div>
              </div>
            );
          })()
        ) : (
          <p className="text-xs text-[var(--status-danger-fg)]">{usage.cloudinary.error}</p>
        )}
      </div>

      {/* MongoDB */}
      <div className="border-line space-y-3 border-t pt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon name="layers" size={15} className="text-muted" />
            <span className="text-ink text-sm font-semibold">MongoDB</span>
          </div>
          {usage.mongodb.ok && (
            <span className="bg-surface text-muted rounded-full px-2 py-0.5 text-[11px] font-medium">
              {formatBytes(usage.mongodb.data.limitBytes)} plan
            </span>
          )}
        </div>

        {usage.mongodb.ok ? (
          (() => {
            const m = usage.mongodb.data;
            const freeBytes = Math.max(0, m.limitBytes - m.totalSizeBytes);
            const pct = m.limitBytes > 0 ? (m.totalSizeBytes / m.limitBytes) * 100 : 0;

            return (
              <div className="space-y-2.5">
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-muted">Disk + indexes</span>
                    <span className="text-ink font-semibold tabular-nums">
                      {formatBytes(m.totalSizeBytes)} / {formatBytes(m.limitBytes)} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <Meter pct={pct} />
                  <p className="text-subtle text-[11px]">
                    Free space: <span className="text-ink font-medium">{formatBytes(freeBytes)}</span>
                  </p>
                </div>

                <div className="bg-surface/60 space-y-1.5 rounded-lg p-3">
                  <StatRow label="Database" value={m.dbName} />
                  <StatRow label="Logical data" value={formatBytes(m.dataSizeBytes)} />
                  <StatRow label="Storage (compressed)" value={formatBytes(m.storageSizeBytes)} />
                  <StatRow label="Indexes" value={formatBytes(m.indexSizeBytes)} />
                  <StatRow
                    label="Collections / Docs"
                    value={`${m.collections} / ${m.objects.toLocaleString()}`}
                  />
                </div>
              </div>
            );
          })()
        ) : (
          <p className="text-xs text-[var(--status-danger-fg)]">{usage.mongodb.error}</p>
        )}
      </div>
    </aside>
  );
}
