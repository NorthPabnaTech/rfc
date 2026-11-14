'use client';

import * as React from 'react';

import type { AnalysisDashboardDTO } from '@/types';
import { ORDER_STATUS_LABELS } from '@lib/constants';
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

/**
 * Grouped Revenue vs Expenses vs Profit chart across the selected date range.
 */
export function RevenueExpensesChart({
  data,
}: {
  data: AnalysisDashboardDTO['timeline'];
}) {
  const [active, setActive] = React.useState<number | null>(null);
  const [showTable, setShowTable] = React.useState(false);
  const maxVal = Math.max(
    1,
    ...data.flatMap((d) => [d.revenue, d.expenses + d.cogs, Math.abs(d.profit)]),
  );
  const { top, step } = niceMax(maxVal);
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4 text-[12px]">
        <span className="flex items-center gap-1.5">
          <span className="bg-brand-500 size-2.5 rounded-sm" /> Revenue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-rose-500" /> Operating Expenses
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-amber-500" /> COGS
        </span>
      </div>

      <div className="flex">
        <div className="text-subtle relative h-[230px] w-12 shrink-0 text-right text-[11px] tabular-nums">
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
        <div className="relative h-[230px] flex-1">
          {ticks.map((t) => (
            <span
              key={t}
              className="bg-line absolute inset-x-0 h-px"
              style={{ bottom: `${(t / top) * 100}%` }}
              aria-hidden
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-1">
            {data.map((d, i) => {
              const revH = (d.revenue / top) * 100;
              const expH = (d.expenses / top) * 100;
              const cogsH = (d.cogs / top) * 100;
              return (
                <button
                  key={d.key}
                  type="button"
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="relative flex h-full flex-1 items-end justify-center gap-[2px] outline-none"
                >
                  <span
                    className={cn(
                      'bg-brand-500 block w-full max-w-2.5 rounded-t-[3px] transition-opacity',
                      active !== null && active !== i && 'opacity-35',
                    )}
                    style={{ height: `${d.revenue > 0 ? Math.max(revH, 2) : 0}%` }}
                  />
                  <span
                    className={cn(
                      'block w-full max-w-2.5 rounded-t-[3px] bg-rose-500 transition-opacity',
                      active !== null && active !== i && 'opacity-35',
                    )}
                    style={{ height: `${d.expenses > 0 ? Math.max(expH, 2) : 0}%` }}
                  />
                  <span
                    className={cn(
                      'block w-full max-w-2.5 rounded-t-[3px] bg-amber-500 transition-opacity',
                      active !== null && active !== i && 'opacity-35',
                    )}
                    style={{ height: `${d.cogs > 0 ? Math.max(cogsH, 2) : 0}%` }}
                  />

                  {active === i && (
                    <span className="bg-noir pointer-events-none absolute bottom-full z-20 mb-2 rounded-lg px-3 py-2 text-left text-[11.5px] whitespace-nowrap text-white shadow-lg">
                      <span className="block font-semibold">{d.label}</span>
                      <span className="block text-white/85">
                        Revenue: ৳{formatNumber(d.revenue)} ({d.orders} orders)
                      </span>
                      <span className="block text-rose-300">
                        Expenses: ৳{formatNumber(d.expenses)}
                      </span>
                      <span className="block text-amber-300">COGS: ৳{formatNumber(d.cogs)}</span>
                      <span
                        className={cn(
                          'mt-0.5 block font-semibold',
                          d.profit >= 0 ? 'text-emerald-300' : 'text-rose-300',
                        )}
                      >
                        Profit: ৳{formatNumber(d.profit)}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="text-subtle mt-2 ml-12 flex justify-between text-[11px]">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>

      <button
        type="button"
        onClick={() => setShowTable((s) => !s)}
        className="text-accent mt-3 text-[12px] font-semibold hover:underline"
      >
        {showTable ? 'Hide breakdown table' : 'View breakdown table'}
      </button>

      {showTable && (
        <div className="border-line mt-2 max-h-64 overflow-y-auto rounded-lg border">
          <table className="w-full text-[12.5px]">
            <thead className="bg-surface text-muted sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Period</th>
                <th className="px-3 py-2 text-right font-medium">Orders</th>
                <th className="px-3 py-2 text-right font-medium">Revenue</th>
                <th className="px-3 py-2 text-right font-medium">COGS</th>
                <th className="px-3 py-2 text-right font-medium">Expenses</th>
                <th className="px-3 py-2 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y tabular-nums">
              {[...data].reverse().map((d) => (
                <tr key={d.key}>
                  <td className="px-3 py-1.5">{d.label}</td>
                  <td className="px-3 py-1.5 text-right">{d.orders}</td>
                  <td className="px-3 py-1.5 text-right">৳{formatNumber(d.revenue)}</td>
                  <td className="px-3 py-1.5 text-right">৳{formatNumber(d.cogs)}</td>
                  <td className="px-3 py-1.5 text-right">৳{formatNumber(d.expenses)}</td>
                  <td
                    className={cn(
                      'px-3 py-1.5 text-right font-semibold',
                      d.profit >= 0 ? 'text-emerald-600' : 'text-rose-600',
                    )}
                  >
                    ৳{formatNumber(d.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Profit & Loss trend bar chart (positive green, negative red). */
export function ProfitTrendChart({ data }: { data: AnalysisDashboardDTO['timeline'] }) {
  const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.profit)));
  const { top } = niceMax(maxAbs, 3);

  return (
    <div className="space-y-3">
      <div className="relative h-[160px] w-full">
        <div className="bg-line absolute inset-x-0 top-1/2 h-px" />
        <div className="absolute inset-0 flex items-center gap-1">
          {data.map((d) => {
            const pct = Math.min(48, (Math.abs(d.profit) / top) * 48);
            const pos = d.profit >= 0;
            return (
              <div
                key={d.key}
                title={`${d.label}: ৳${formatNumber(d.profit)}`}
                className="relative flex h-full flex-1 flex-col items-center justify-center"
              >
                {d.profit !== 0 && (
                  <span
                    className={cn(
                      'absolute w-full max-w-4',
                      pos
                        ? 'bottom-1/2 rounded-t-[3px] bg-emerald-500'
                        : 'top-1/2 rounded-b-[3px] bg-rose-500',
                    )}
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="text-subtle flex justify-between text-[11px]">
        <span>{data[0]?.label}</span>
        <span>Zero line (৳0)</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function ExpenseCategoryBreakdown({
  rows,
}: {
  rows: AnalysisDashboardDTO['expenseByCategory'];
}) {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  if (rows.length === 0) {
    return <p className="text-muted text-sm">No expenses recorded in this period.</p>;
  }
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const pct = total > 0 ? Math.round((r.amount / total) * 100) : 0;
        return (
          <div key={r.categoryId}>
            <div className="flex items-baseline justify-between gap-2 text-[13px]">
              <span className="text-ink truncate font-medium">
                {r.categoryName}
                {r.isCostOfGoods && (
                  <span className="text-subtle ml-1.5 text-[11px]">(COGS / Stock)</span>
                )}
              </span>
              <span className="text-ink shrink-0 font-semibold tabular-nums">
                ৳{formatNumber(r.amount)} ({pct}%)
              </span>
            </div>
            <div className="bg-well mt-1 h-2 overflow-hidden rounded-full">
              <div
                className={cn(
                  'h-full rounded-full',
                  r.isCostOfGoods ? 'bg-amber-500' : 'bg-rose-500',
                )}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function OrderStatusBreakdown({
  rows,
}: {
  rows: AnalysisDashboardDTO['ordersByStatus'];
}) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  if (rows.length === 0) {
    return <p className="text-muted text-sm">No orders in this period.</p>;
  }
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
        return (
          <div key={r.status}>
            <div className="flex items-baseline justify-between gap-2 text-[13px]">
              <span className="text-ink font-medium">{ORDER_STATUS_LABELS[r.status]}</span>
              <span className="text-muted tabular-nums">
                {r.count} ({pct}%) · ৳{formatNumber(r.revenue)}
              </span>
            </div>
            <div className="bg-well mt-1 h-2 overflow-hidden rounded-full">
              <div
                className={cn(
                  'h-full rounded-full',
                  r.status === 'cancelled'
                    ? 'bg-rose-500'
                    : r.status === 'returned'
                      ? 'bg-amber-500'
                      : 'bg-brand-500',
                )}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
