'use client';

import * as React from 'react';

import { cn, formatNumber, formatStoreDate } from '@lib/utils';

type Point = { date: string; revenue: number; orders: number };

/** Clean tick step: 1, 2, 2.5, 5 × 10ⁿ so labels read 0 / 5,000 / 10,000. */
function niceMax(max: number, ticks = 4): { top: number; step: number } {
  if (max <= 0) return { top: ticks, step: 1 };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  return { top: step * ticks, step };
}

const compact = (n: number) =>
  n >= 100000
    ? `${formatNumber(n / 100000, { maximumFractionDigits: 1 })}L`
    : n >= 1000
      ? `${formatNumber(n / 1000, { maximumFractionDigits: 1 })}K`
      : formatNumber(n);

/**
 * Daily revenue, single series → no legend (the card title names it).
 * Columns ≤ 24px with 4px rounded tops on one baseline; each column is its
 * own hover/focus target with a tooltip. A table view carries every value.
 */
export function RevenueChart({ data }: { data: Point[] }) {
  const [active, setActive] = React.useState<number | null>(null);
  const [showTable, setShowTable] = React.useState(false);
  const { top, step } = niceMax(Math.max(...data.map((d) => d.revenue)));
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const best = data.reduce((b, d, i) => (d.revenue > (data[b]?.revenue ?? 0) ? i : b), 0);

  return (
    <div>
      <div className="flex">
        {/* y-axis */}
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
          {/* gridlines: hairline, solid, recessive */}
          {ticks.map((t) => (
            <span
              key={t}
              className="bg-line absolute inset-x-0 h-px"
              style={{ bottom: `${(t / top) * 100}%` }}
              aria-hidden
            />
          ))}
          <div
            className="absolute inset-0 flex items-end gap-[2px]"
            role="list"
            aria-label="Revenue per day"
          >
            {data.map((d, i) => {
              const h = (d.revenue / top) * 100;
              return (
                <button
                  key={d.date}
                  type="button"
                  role="listitem"
                  aria-label={`${formatStoreDate(d.date)}: ৳${formatNumber(d.revenue)}, ${d.orders} orders`}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="group relative flex h-full flex-1 items-end justify-center outline-none"
                >
                  <span
                    className={cn(
                      'block w-full max-w-6 rounded-t-[4px] bg-[#a67a31] transition-opacity',
                      active !== null && active !== i && 'opacity-40',
                      d.revenue === 0 && 'bg-transparent',
                    )}
                    style={{ height: `${Math.max(h, d.revenue > 0 ? 1.5 : 0)}%` }}
                  />
                  {/* selective direct label: only the best day */}
                  {i === best && d.revenue > 0 && active === null && (
                    <span
                      className="text-ink absolute -translate-y-1 text-[11px] font-semibold whitespace-nowrap"
                      style={{ bottom: `${h}%` }}
                    >
                      ৳{compact(d.revenue)}
                    </span>
                  )}
                  {active === i && (
                    <span
                      className="bg-noir pointer-events-none absolute z-10 mb-2 rounded-lg px-3 py-2 text-left whitespace-nowrap text-white shadow-lg"
                      style={{ bottom: `${h}%` }}
                    >
                      <span className="block text-[13px] font-bold">
                        ৳{formatNumber(d.revenue)}
                      </span>
                      <span className="block text-[11px] text-white/70">
                        {formatStoreDate(d.date, 'ddd, DD MMM')} · {d.orders}{' '}
                        {d.orders === 1 ? 'order' : 'orders'}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {/* x-axis: first, middle, last date */}
      <div className="text-subtle mt-2 ml-12 flex justify-between text-[11px]">
        <span>{formatStoreDate(data[0]?.date, 'DD MMM')}</span>
        <span>{formatStoreDate(data[Math.floor(data.length / 2)]?.date, 'DD MMM')}</span>
        <span>{formatStoreDate(data[data.length - 1]?.date, 'DD MMM')}</span>
      </div>

      <button
        type="button"
        onClick={() => setShowTable((s) => !s)}
        className="text-accent mt-3 text-[12px] font-semibold hover:underline"
      >
        {showTable ? 'Hide table' : 'View as table'}
      </button>
      {showTable && (
        <div className="border-line mt-2 max-h-64 overflow-y-auto rounded-lg border">
          <table className="w-full text-[12.5px]">
            <thead className="bg-surface text-muted sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-right font-medium">Orders</th>
                <th className="px-3 py-2 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y tabular-nums">
              {[...data].reverse().map((d) => (
                <tr key={d.date}>
                  <td className="px-3 py-1.5">{formatStoreDate(d.date)}</td>
                  <td className="px-3 py-1.5 text-right">{d.orders}</td>
                  <td className="px-3 py-1.5 text-right">৳{formatNumber(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Horizontal bars for a breakdown (single hue; value at the bar tip). */
export function BarList({ rows }: { rows: { label: string; value: number; hint?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="text-muted text-sm">No data yet.</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} title={r.hint}>
          <div className="mb-1 flex justify-between text-[12.5px]">
            <span className="text-ink">{r.label}</span>
            <span className="text-ink font-semibold tabular-nums">{formatNumber(r.value)}</span>
          </div>
          <div className="bg-well h-2 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-[#a67a31]"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
          {r.hint && <p className="text-subtle mt-0.5 text-[11px]">{r.hint}</p>}
        </li>
      ))}
    </ul>
  );
}
