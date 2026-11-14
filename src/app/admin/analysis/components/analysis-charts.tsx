'use client';

import * as React from 'react';

import type { AnalysisDashboardDTO } from '@/types';
import { cn, formatNumber } from '@lib/utils';

function niceMax(max: number, ticks = 4): { top: number; step: number } {
  if (max <= 0) return { top: ticks, step: 1 };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  return { top: step * ticks, step };
}

const compact = (n: number) => {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 100000) return `${sign}${formatNumber(abs / 100000, { maximumFractionDigits: 1 })}L`;
  if (abs >= 1000) return `${sign}${formatNumber(abs / 1000, { maximumFractionDigits: 1 })}K`;
  return `${sign}${formatNumber(abs)}`;
};

function buildSmoothLinePath(coords: Array<{ x: number; y: number }>): string {
  const n = coords.length;
  if (n === 0) return '';
  const p0 = coords[0]!;
  if (n === 1) return `M ${p0.x},${p0.y}`;
  if (n === 2) {
    const p1 = coords[1]!;
    return `M ${p0.x},${p0.y} L ${p1.x},${p1.y}`;
  }

  const secants: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const curr = coords[i]!;
    const next = coords[i + 1]!;
    const dx = next.x - curr.x;
    secants.push(dx === 0 ? 0 : (next.y - curr.y) / dx);
  }

  const tangents = new Array<number>(n).fill(0);
  tangents[0] = secants[0]!;
  tangents[n - 1] = secants[n - 2]!;
  for (let i = 1; i < n - 1; i++) {
    const prevS = secants[i - 1]!;
    const currS = secants[i]!;
    tangents[i] = prevS * currS <= 0 ? 0 : (prevS + currS) / 2;
  }

  for (let i = 0; i < n - 1; i++) {
    const d = secants[i]!;
    if (d === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const a = tangents[i]! / d;
      const b = tangents[i + 1]! / d;
      const magSq = a * a + b * b;
      if (magSq > 9) {
        const tau = 3 / Math.sqrt(magSq);
        tangents[i] = tau * a * d;
        tangents[i + 1] = tau * b * d;
      }
    }
  }

  let path = `M ${p0.x},${p0.y}`;
  for (let i = 0; i < n - 1; i++) {
    const curr = coords[i]!;
    const next = coords[i + 1]!;
    const dx3 = (next.x - curr.x) / 3;
    const cp1x = curr.x + dx3;
    const cp1y = curr.y + tangents[i]! * dx3;
    const cp2x = next.x - dx3;
    const cp2y = next.y - tangents[i + 1]! * dx3;
    path += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${next.x.toFixed(2)},${next.y.toFixed(2)}`;
  }
  return path;
}

function buildSmoothAreaPath(coords: Array<{ x: number; y: number }>, baselineY: number): string {
  if (coords.length < 2) return '';
  const line = buildSmoothLinePath(coords);
  const first = coords[0]!;
  const last = coords[coords.length - 1]!;
  return `${line} L ${last.x.toFixed(2)},${baselineY} L ${first.x.toFixed(2)},${baselineY} Z`;
}

type CryptoSeriesPoint = {
  key: string;
  label: string;
  primary: number;
  secondary: number;
  tooltipRows: { label: string; value: string; colorClass?: string }[];
};

function CryptoDualAreaChart({
  points,
  primaryLabel,
  secondaryLabel,
  primaryColor,
  secondaryColor,
  primaryDotClass,
  secondaryDotClass,
  idPrefix,
}: {
  points: CryptoSeriesPoint[];
  primaryLabel: string;
  secondaryLabel: string;
  primaryColor: string;
  secondaryColor: string;
  primaryDotClass: string;
  secondaryDotClass: string;
  idPrefix: string;
}) {
  const [active, setActive] = React.useState<number | null>(null);

  if (points.length === 0) {
    return <p className="text-subtle py-12 text-center text-sm">No data in this period.</p>;
  }

  const maxVal = Math.max(1, ...points.flatMap((p) => [p.primary, p.secondary]));
  const { top, step } = niceMax(maxVal);
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);

  const W = 500;
  const H = 220;
  const xFor = (i: number) => (points.length === 1 ? W / 2 : (i / (points.length - 1)) * W);
  const yFor = (val: number) => H - (val / top) * H;

  const primaryCoords = points.map((p, i) => ({ x: xFor(i), y: yFor(p.primary) }));
  const secondaryCoords = points.map((p, i) => ({ x: xFor(i), y: yFor(p.secondary) }));

  const primaryLine = buildSmoothLinePath(primaryCoords);
  const secondaryLine = buildSmoothLinePath(secondaryCoords);

  const primaryArea = buildSmoothAreaPath(primaryCoords, H);
  const secondaryArea = buildSmoothAreaPath(secondaryCoords, H);

  const pGradId = `${idPrefix}-primary-grad`;
  const sGradId = `${idPrefix}-secondary-grad`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4 text-[12px]">
        <span className="flex items-center gap-1.5">
          <span className={cn('size-2.5 rounded-full', primaryDotClass)} /> {primaryLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={cn('size-2.5 rounded-full', secondaryDotClass)} /> {secondaryLabel}
        </span>
      </div>

      <div className="flex">
        <div className="text-subtle relative h-[220px] w-12 shrink-0 text-right text-[11px] tabular-nums">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-2 -translate-y-1/2"
              style={{ bottom: `${(t / top) * 100}%` }}
            >
              {compact(t)}
            </span>
          ))}
        </div>

        <div className="relative h-[220px] flex-1">
          {ticks.map((t) => (
            <span
              key={t}
              className="bg-line absolute inset-x-0 h-px"
              style={{ bottom: `${(t / top) * 100}%` }}
              aria-hidden
            />
          ))}

          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="size-full overflow-visible">
            <defs>
              <linearGradient id={pGradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={primaryColor} stopOpacity="0.22" />
                <stop offset="100%" stopColor={primaryColor} stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id={sGradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={secondaryColor} stopOpacity="0.20" />
                <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {points.length > 1 && (
              <>
                <path d={secondaryArea} fill={`url(#${sGradId})`} />
                <path d={primaryArea} fill={`url(#${pGradId})`} />
                <path
                  fill="none"
                  stroke={secondaryColor}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  d={secondaryLine}
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  fill="none"
                  stroke={primaryColor}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  d={primaryLine}
                  vectorEffect="non-scaling-stroke"
                />
              </>
            )}
          </svg>

          {/* Interactive crosshair columns + hover dots + tooltip */}
          <div className="absolute inset-0 flex">
            {points.map((p, i) => {
              const isEdgeLeft = i < 2;
              const isEdgeRight = i > points.length - 3;
              return (
                <button
                  key={p.key}
                  type="button"
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="relative h-full flex-1 outline-none"
                >
                  {active === i && (
                    <span
                      aria-hidden
                      className="bg-ink/20 pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2"
                    />
                  )}
                  <span
                    className={cn(
                      'pointer-events-none absolute left-1/2 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white transition-all',
                      primaryDotClass,
                      points.length === 1 || active === i ? 'size-3 scale-110 shadow' : 'size-1.5 opacity-80',
                    )}
                    style={{ bottom: `${(p.primary / top) * 100}%` }}
                  />
                  <span
                    className={cn(
                      'pointer-events-none absolute left-1/2 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white transition-all',
                      secondaryDotClass,
                      points.length === 1 || active === i ? 'size-3 scale-110 shadow' : 'size-1.5 opacity-80',
                    )}
                    style={{ bottom: `${(p.secondary / top) * 100}%` }}
                  />

                  {active === i && (
                    <span
                      className={cn(
                        'bg-noir pointer-events-none absolute bottom-full z-20 mb-2 rounded-lg px-3 py-2 text-left text-[11.5px] whitespace-nowrap text-white shadow-lg',
                        isEdgeLeft
                          ? 'left-0'
                          : isEdgeRight
                            ? 'right-0'
                            : 'left-1/2 -translate-x-1/2',
                      )}
                    >
                      <span className="mb-0.5 block font-semibold">{p.label}</span>
                      {p.tooltipRows.map((row) => (
                        <span
                          key={row.label}
                          className={cn('block', row.colorClass ?? 'text-white/85')}
                        >
                          {row.label}: {row.value}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="text-subtle mt-2 flex justify-between pl-12 text-[10.5px]">
        <span>{points[0]?.label}</span>
        {points.length > 2 && <span>{points[Math.floor(points.length / 2)]?.label}</span>}
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/**
 * Crypto-style Running Revenue vs Remaining Expense Balance chart:
 * Expenses persist until offset by revenue (e.g. 200 expense + 150 revenue -> 50 remaining expense).
 */
function buildRevenueExpensePoints(
  data: AnalysisDashboardDTO['timeline'],
): CryptoSeriesPoint[] {
  let cumRev = 0;
  let cumExp = 0;
  return data.map((d) => {
    const dayExp = d.expenses + d.cogs;
    cumRev += d.revenue;
    cumExp += dayExp;
    const uncoveredExp = Math.max(0, cumExp - cumRev);
    return {
      key: d.key,
      label: d.label,
      primary: cumRev,
      secondary: uncoveredExp,
      tooltipRows: [
        { label: 'Total Revenue', value: `৳${formatNumber(cumRev)}`, colorClass: 'text-sky-300' },
        {
          label: 'Uncovered Expense',
          value: `৳${formatNumber(uncoveredExp)}`,
          colorClass: 'text-rose-300',
        },
        {
          label: 'Cumulative Spend',
          value: `৳${formatNumber(cumExp)}`,
          colorClass: 'text-white/75',
        },
      ],
    };
  });
}

function buildProfitLossPoints(
  data: AnalysisDashboardDTO['timeline'],
): CryptoSeriesPoint[] {
  let cumRev = 0;
  let cumExp = 0;
  return data.map((d) => {
    cumRev += d.revenue;
    cumExp += d.expenses + d.cogs;
    const net = cumRev - cumExp;
    const profit = Math.max(0, net);
    const loss = Math.max(0, -net);
    return {
      key: d.key,
      label: d.label,
      primary: profit,
      secondary: loss,
      tooltipRows: [
        {
          label: 'Total Profit',
          value: `৳${formatNumber(profit)}`,
          colorClass: 'text-emerald-300',
        },
        { label: 'Total Loss', value: `৳${formatNumber(loss)}`, colorClass: 'text-rose-300' },
        {
          label: 'Net Balance',
          value: `${net >= 0 ? '+' : '-'}৳${formatNumber(Math.abs(net))}`,
          colorClass: net >= 0 ? 'text-emerald-200' : 'text-rose-200',
        },
      ],
    };
  });
}

export function RevenueExpensesChart({
  data,
}: {
  data: AnalysisDashboardDTO['timeline'];
}) {
  const points = React.useMemo(() => buildRevenueExpensePoints(data), [data]);

  return (
    <CryptoDualAreaChart
      idPrefix="rev-exp"
      points={points}
      primaryLabel="Total Revenue"
      secondaryLabel="Remaining Expense"
      primaryColor="#3b82f6"
      secondaryColor="#f43f5e"
      primaryDotClass="bg-brand-500"
      secondaryDotClass="bg-rose-500"
    />
  );
}

/**
 * Crypto-style Running Profit vs Loss Line/Area Chart.
 */
export function ProfitLossLineChart({
  data,
}: {
  data: AnalysisDashboardDTO['timeline'];
}) {
  const points = React.useMemo(() => buildProfitLossPoints(data), [data]);

  return (
    <CryptoDualAreaChart
      idPrefix="profit-loss"
      points={points}
      primaryLabel="Total Profit"
      secondaryLabel="Total Loss"
      primaryColor="#10b981"
      secondaryColor="#f43f5e"
      primaryDotClass="bg-emerald-500"
      secondaryDotClass="bg-rose-500"
    />
  );
}

/**
 * Pie / Donut chart for Total Orders, Delivered, Cancelled, and Returned orders.
 */
export function OrdersPieChart({
  totalOrders,
  completedOrders,
  cancelledOrders,
  returnedOrders,
}: {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
}) {
  const [activeLabel, setActiveLabel] = React.useState<string | null>(null);

  const otherActive = Math.max(
    0,
    totalOrders - completedOrders - cancelledOrders - returnedOrders,
  );

  const slices = [
    { label: 'Total Delivered', count: completedOrders, color: '#10b981' },
    { label: 'Cancelled Orders', count: cancelledOrders, color: '#f43f5e' },
    { label: 'Returned Orders', count: returnedOrders, color: '#f59e0b' },
    ...(otherActive > 0
      ? [{ label: 'Pending / Active', count: otherActive, color: '#6366f1' }]
      : []),
  ];

  const radius = 64;
  const circumference = 2 * Math.PI * radius;

  const segments = slices.reduce<
    Array<{
      label: string;
      count: number;
      color: string;
      dash: number;
      offset: number;
      pct: number;
    }>
  >((acc, s) => {
    const prevUsed = acc.reduce((sum, item) => sum + item.dash, 0);
    const ratio = totalOrders > 0 ? s.count / totalOrders : 0;
    const dash = ratio * circumference;
    acc.push({
      ...s,
      dash,
      offset: -prevUsed,
      pct: Math.round(ratio * 100),
    });
    return acc;
  }, []);

  const activeSeg = segments.find((s) => s.label === activeLabel) ?? null;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative grid size-44 shrink-0 place-items-center">
        {activeSeg && (
          <div className="bg-noir pointer-events-none absolute -top-3 left-1/2 z-20 -translate-x-1/2 -translate-y-full rounded-lg px-3 py-2 text-left text-[11.5px] whitespace-nowrap text-white shadow-lg">
            <div className="mb-0.5 flex items-center gap-1.5 font-semibold">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: activeSeg.color }}
              />
              {activeSeg.label}
            </div>
            <div className="text-white/90">
              Orders: <span className="font-semibold">{formatNumber(activeSeg.count)}</span> (
              {activeSeg.pct}%)
            </div>
            <div className="text-white/70">Total Orders: {formatNumber(totalOrders)}</div>
          </div>
        )}

        <svg viewBox="0 0 160 160" className="size-full -rotate-90 overflow-visible">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-well"
            strokeWidth="22"
          />
          {totalOrders > 0 &&
            segments.map((seg) => {
              if (seg.count <= 0) return null;
              const isActive = activeLabel === seg.label;
              const isDimmed = activeLabel !== null && !isActive;
              return (
                <circle
                  key={seg.label}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={isActive ? 26 : 22}
                  strokeDasharray={`${seg.dash} ${circumference}`}
                  strokeDashoffset={seg.offset}
                  opacity={isDimmed ? 0.35 : 1}
                  className="cursor-pointer transition-all duration-150"
                  onPointerEnter={() => setActiveLabel(seg.label)}
                  onPointerLeave={() => setActiveLabel(null)}
                />
              );
            })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-subtle text-[11px] font-medium">
            {activeSeg ? activeSeg.label : 'Total Orders'}
          </span>
          <span className="text-ink text-2xl font-bold tabular-nums">
            {formatNumber(activeSeg ? activeSeg.count : totalOrders)}
          </span>
          {activeSeg && (
            <span className="text-subtle text-[10.5px] font-medium tabular-nums">
              {activeSeg.pct}% of {formatNumber(totalOrders)}
            </span>
          )}
        </div>
      </div>

      <div className="w-full flex-1 space-y-2.5">
        {slices.map((s) => {
          const pct = totalOrders > 0 ? Math.round((s.count / totalOrders) * 100) : 0;
          const isActive = activeLabel === s.label;
          return (
            <div
              key={s.label}
              onPointerEnter={() => s.count > 0 && setActiveLabel(s.label)}
              onPointerLeave={() => setActiveLabel(null)}
              className={cn(
                'bg-surface flex items-center justify-between rounded-xl px-3.5 py-2 text-[12.5px] transition-colors',
                s.count > 0 && 'cursor-pointer',
                isActive && 'ring-brand-500/40 bg-well ring-1',
              )}
            >
              <span className="text-ink flex items-center gap-2 font-medium">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </span>
              <span className="text-ink font-semibold tabular-nums">
                {formatNumber(s.count)}{' '}
                <span className="text-subtle text-[11px] font-normal">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Extra Chart: Orders & Revenue by Platform (Website, Facebook, Instagram, WhatsApp, etc.).
 */
export function PlatformRevenueChart({
  items,
}: {
  items: NonNullable<AnalysisDashboardDTO['platformBreakdown']>;
}) {
  if (!items.length) {
    return <p className="text-subtle py-10 text-center text-sm">No orders in this period.</p>;
  }
  const maxRev = Math.max(1, ...items.map((i) => i.revenue));

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = Math.round((item.revenue / maxRev) * 100);
        return (
          <div key={item.platform} className="space-y-1">
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="text-ink font-medium">
                {item.label}{' '}
                <span className="text-subtle text-[11px]">({item.orders} orders)</span>
              </span>
              <span className="text-ink font-semibold tabular-nums">
                ৳{formatNumber(item.revenue)}
              </span>
            </div>
            <div className="bg-well h-2.5 overflow-hidden rounded-full">
              <div
                className="bg-brand-500 h-full rounded-full transition-all"
                style={{ width: `${item.revenue > 0 ? Math.max(pct, 4) : 0}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
