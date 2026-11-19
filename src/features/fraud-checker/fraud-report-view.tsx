'use client';

import type { FraudCheckReport, FraudCourierMetric } from '@/services/fraud-checker';
import { Icon } from '@components/icon/icon';
import { Callout, StatusBadge } from '@components/shared';
import { Badge } from '@components/ui/badge';
import { formatNumber } from '@lib/utils';

function riskBadgeStatus(status?: string): 'ok' | 'warn' | 'danger' | 'neutral' {
  const s = (status ?? '').toLowerCase();
  if (s === 'safe') return 'ok';
  if (s.includes('moderate')) return 'warn';
  if (s.includes('high')) return 'danger';
  return 'neutral';
}

function sourceLabel(source?: string): string | null {
  switch (source) {
    case 'live':
      return 'Live';
    case 'database_cache':
      return 'Cached';
    case 'offline_fallback':
      return 'Offline fallback';
    default:
      return source ? source.replace(/_/g, ' ') : null;
  }
}

function formatMetric(value: number | null, suffix = ''): string {
  if (value === null) return 'Unavailable';
  return `${formatNumber(value)}${suffix}`;
}

function formatPercentage(value: number | null): string {
  if (value === null) return 'Unavailable';
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)}%`;
}

function formatRating(rating?: string): string | null {
  if (!rating) return null;
  return rating.replace(/_/g, ' ');
}

function CourierRow({ c }: { c: FraudCourierMetric }) {
  const ratingText = formatRating(c.rating);
  return (
    <tr className="border-line border-t text-xs">
      <td className="px-3 py-2.5 font-semibold">
        <span className="text-ink">{c.label}</span>
        {ratingText && (
          <span className="text-subtle block text-[11px] font-normal capitalize">
            {ratingText}
          </span>
        )}
      </td>
      {!c.available ? (
        <td colSpan={5} className="text-subtle px-3 py-2.5">
          Unavailable{c.message ? ` — ${c.message}` : ''}
        </td>
      ) : (
        <>
          <td className="text-ink px-3 py-2.5 text-right font-medium tabular-nums">
            {formatMetric(c.total)}
          </td>
          <td className="px-3 py-2.5 text-right font-semibold text-[var(--status-ok-fg)] tabular-nums">
            {formatMetric(c.success)}
          </td>
          <td className="px-3 py-2.5 text-right font-semibold text-[var(--status-danger-fg)] tabular-nums">
            {formatMetric(c.cancel)}
          </td>
          <td className="text-ink px-3 py-2.5 text-right font-medium tabular-nums">
            {formatPercentage(c.deliveredPercentage)}
          </td>
          <td className="text-muted px-3 py-2.5 text-right font-medium tabular-nums">
            {formatPercentage(c.returnPercentage)}
          </td>
        </>
      )}
    </tr>
  );
}

export function FraudReportView({ report }: { report: FraudCheckReport }) {
  const src = sourceLabel(report.source);
  const noHistory =
    report.totalParcel === 0 &&
    report.communityReports.length === 0 &&
    (report.unresolvedReports === null || report.unresolvedReports === 0);

  return (
    <div className="space-y-5">
      {/* Header summary */}
      <div className="bg-well border-line flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-subtle text-[11px] font-semibold tracking-wide uppercase">
              Customer Phone
            </span>
            {src && (
              <Badge tone="neutral" className="text-[10px]">
                {src}
              </Badge>
            )}
          </div>
          <p className="text-ink font-mono text-base font-bold tracking-tight">{report.phone}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right">
            <span className="text-subtle block text-[11px] font-semibold tracking-wide uppercase">
              Overall Score
            </span>
            <span className="text-ink text-lg font-bold tabular-nums">
              {report.score !== null ? `${report.score}%` : 'Unavailable'}
            </span>
          </div>
          <StatusBadge
            status={riskBadgeStatus(report.status)}
            label={report.status ?? 'Unknown Risk'}
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Total Parcels" value={formatMetric(report.totalParcel)} tone="neutral" />
        <MetricCard
          label="Delivered"
          value={formatMetric(report.successParcel)}
          tone="ok"
        />
        <MetricCard
          label="Cancelled / Returned"
          value={formatMetric(report.cancelParcel)}
          tone={report.cancelParcel && report.cancelParcel > 0 ? 'warn' : 'neutral'}
        />
        <MetricCard
          label="Unresolved Reports"
          value={formatMetric(report.unresolvedReports)}
          tone={report.unresolvedReports && report.unresolvedReports > 0 ? 'danger' : 'neutral'}
        />
      </div>

      {noHistory && (
        <Callout
          tone="info"
          title="No courier history found"
          description="No prior parcel records or community fraud reports were found for this phone number."
        />
      )}

      {/* Courier-wise breakdown */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-ink text-xs font-semibold tracking-wide uppercase">
            Courier-wise breakdown
          </h3>
          <span className="text-subtle text-[11px]">
            Cancelled &amp; returned are combined by API
          </span>
        </div>

        {report.couriers.length === 0 ? (
          <p className="text-muted border-line rounded-xl border p-4 text-center text-xs">
            Courier-wise breakdown unavailable.
          </p>
        ) : (
          <div className="border-line overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[460px] border-collapse text-left">
              <thead>
                <tr className="bg-well text-muted text-[11px] font-semibold uppercase">
                  <th className="px-3 py-2">Courier</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Delivered</th>
                  <th className="px-3 py-2 text-right">Cancel / Ret.</th>
                  <th className="px-3 py-2 text-right">Success %</th>
                  <th className="px-3 py-2 text-right">Return %</th>
                </tr>
              </thead>
              <tbody>
                {report.couriers.map((c) => (
                  <CourierRow key={c.key} c={c} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Community fraud reports */}
      <div>
        <h3 className="text-ink mb-2 text-xs font-semibold tracking-wide uppercase">
          Community Fraud Reports ({report.communityReports.length})
        </h3>
        {report.communityReports.length === 0 ? (
          <p className="text-muted border-line rounded-xl border px-4 py-3 text-xs">
            No community fraud reports recorded for this number.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {report.communityReports.map((r, idx) => (
              <li
                key={r.reportCode ?? idx}
                className="border-line bg-well flex flex-wrap items-start justify-between gap-3 rounded-xl border p-3.5 text-xs"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-ink font-semibold">
                      {r.title ?? 'Merchant Fraud Report'}
                    </p>
                    {r.status && (
                      <StatusBadge
                        status={r.status.toLowerCase() === 'verified' ? 'danger' : 'warn'}
                        label={r.status}
                      />
                    )}
                  </div>
                  <div className="text-muted flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                    {r.courierName && <span>Courier: {r.courierName}</span>}
                    {r.incidentType && (
                      <span>Type: {r.incidentType.replace(/_/g, ' ')}</span>
                    )}
                    {r.orderAmount !== undefined && (
                      <span>Amount: ৳{formatNumber(r.orderAmount)}</span>
                    )}
                    {r.evidencesCount !== undefined && (
                      <span>Evidences: {r.evidencesCount}</span>
                    )}
                    {r.createdAt && <span>{r.createdAt}</span>}
                  </div>
                </div>
                {r.reportUrl && (
                  <a
                    href={r.reportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent inline-flex shrink-0 items-center gap-1 font-semibold hover:underline"
                  >
                    Open report <Icon name="external" size={12} />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'ok' | 'warn' | 'danger' | 'neutral';
}) {
  const styles: Record<typeof tone, string> = {
    ok: 'border-[var(--status-ok-bg)] bg-[var(--status-ok-bg)]/40 text-[var(--status-ok-fg)]',
    warn: 'border-[var(--status-warn-bg)] bg-[var(--status-warn-bg)]/40 text-[var(--status-warn-fg)]',
    danger:
      'border-[var(--status-danger-bg)] bg-[var(--status-danger-bg)]/40 text-[var(--status-danger-fg)]',
    neutral: 'border-line bg-well text-ink',
  };

  return (
    <div className={`rounded-xl border px-3.5 py-3 ${styles[tone]}`}>
      <p className="text-muted text-[11px] font-medium">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
