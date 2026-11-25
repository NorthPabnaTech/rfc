'use client';

import * as React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';

import { cn } from '@lib/utils';

/*
 * Chart primitives on Recharts, styled entirely with theme tokens so they
 * follow Light / Dark automatically. Colours come from the validated series
 * tokens (--chart-1 … --chart-5, fixed order — see tokens.css). Rules kept:
 * one y-axis, thin marks, 4px rounded bar ends, recessive grid, a legend for
 * ≥ 2 series and a hover tooltip on every chart.
 */

export type Series = { key: string; label: string; color?: string };
export const SERIES_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const colorOf = (s: Series, i: number) => s.color ?? SERIES_COLORS[i % SERIES_COLORS.length]!;

const AXIS = { fill: 'var(--color-muted)', fontSize: 12 };

export function Legend({ series, className }: { series: Series[]; className?: string }) {
  if (series.length < 2) return null;
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5', className)}>
      {series.map((s, i) => (
        <li key={s.key} className="text-muted flex items-center gap-1.5 text-[13px] font-medium">
          <span
            className="size-2.5 rounded-[3px]"
            style={{ background: colorOf(s, i) }}
            aria-hidden
          />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

function TooltipCard({
  active,
  payload,
  label,
  format,
  labelFormat,
  series,
}: TooltipProps<number, string> & {
  format: (v: number, key: string) => string;
  labelFormat?: (l: string) => string;
  series: Series[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-panel border-line shadow-pop min-w-40 rounded-lg border px-3 py-2.5">
      {label !== undefined && (
        <div className="text-ink mb-1.5 text-xs font-semibold">
          {labelFormat ? labelFormat(String(label)) : String(label)}
        </div>
      )}
      <ul className="space-y-1">
        {payload.map((p) => {
          const idx = series.findIndex((s) => s.key === p.dataKey);
          const s = series[idx];
          return (
            <li key={String(p.dataKey)} className="flex items-center justify-between gap-4 text-xs">
              <span className="text-muted flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ background: s ? colorOf(s, idx) : (p.color as string) }}
                  aria-hidden
                />
                {s?.label ?? p.name}
              </span>
              <span className="num text-ink font-semibold">
                {format(Number(p.value ?? 0), String(p.dataKey))}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type CartesianProps<T> = {
  data: T[];
  xKey: keyof T & string;
  series: Series[];
  height?: number;
  /** Tooltip value formatter. */
  format: (v: number, key: string) => string;
  /** Y-axis tick formatter (compact). */
  tickFormat?: (v: number) => string;
  xTickFormat?: (v: string) => string;
  labelFormat?: (l: string) => string;
};

export function AreaTrend<T extends Record<string, unknown>>({
  data,
  xKey,
  series,
  height = 260,
  format,
  tickFormat,
  xTickFormat,
  labelFormat,
}: CartesianProps<T>) {
  const id = React.useId().replace(/:/g, '');
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`${id}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colorOf(s, i)} stopOpacity={0.28} />
                <stop offset="100%" stopColor={colorOf(s, i)} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            tickFormatter={xTickFormat}
            minTickGap={16}
          />
          <YAxis
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={tickFormat}
          />
          <Tooltip
            cursor={{ stroke: 'var(--color-line-2)', strokeWidth: 1 }}
            content={
              <TooltipCard
                format={format}
                labelFormat={labelFormat ?? xTickFormat}
                series={series}
              />
            }
          />
          {series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={colorOf(s, i)}
              strokeWidth={2}
              fill={`url(#${id}-${s.key})`}
              activeDot={{ r: 4.5, strokeWidth: 2, stroke: 'var(--color-panel)' }}
              dot={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarSeries<T extends Record<string, unknown>>({
  data,
  xKey,
  series,
  height = 260,
  format,
  tickFormat,
  xTickFormat,
  labelFormat,
  stacked = false,
}: CartesianProps<T> & { stacked?: boolean }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          barGap={2}
          barCategoryGap="28%"
        >
          <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            tickFormatter={xTickFormat}
          />
          <YAxis
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={tickFormat}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-well)', opacity: 0.6 }}
            content={
              <TooltipCard
                format={format}
                labelFormat={labelFormat ?? xTickFormat}
                series={series}
              />
            }
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              fill={colorOf(s, i)}
              stackId={stacked ? 'stack' : undefined}
              // Rounded data-end only on the top segment of a stack.
              radius={
                stacked ? (i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]) : [4, 4, 0, 0]
              }
              stroke={stacked ? 'var(--color-panel)' : undefined}
              strokeWidth={stacked ? 1 : 0}
              maxBarSize={stacked ? 34 : 18}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({
  data,
  height = 220,
  format,
  centerLabel,
  centerValue,
}: {
  data: { key: string; label: string; value: number; color?: string }[];
  height?: number;
  format: (v: number) => string;
  centerLabel?: string;
  centerValue?: string;
}) {
  const series: Series[] = data.map((d) => ({ key: d.key, label: d.label, color: d.color }));
  return (
    <div style={{ height }} className="relative w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]!;
              const idx = data.findIndex((d) => d.key === p.payload.key);
              return (
                <div className="bg-panel border-line shadow-pop rounded-lg border px-3 py-2 text-xs">
                  <span className="text-muted flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: colorOf(series[idx]!, idx) }}
                    />
                    {data[idx]?.label}
                  </span>
                  <div className="num text-ink mt-0.5 font-semibold">{format(Number(p.value))}</div>
                </div>
              );
            }}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="64%"
            outerRadius="92%"
            paddingAngle={2}
            cornerRadius={4}
            stroke="var(--color-panel)"
            strokeWidth={2}
          >
            {data.map((d, i) => (
              <Cell key={d.key} fill={colorOf(series[i]!, i)} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            {centerValue && <div className="num text-ink text-lg font-bold">{centerValue}</div>}
            {centerLabel && <div className="text-muted text-[11px] font-medium">{centerLabel}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Horizontal labelled bars — used for the order-status breakdown (8 states is
 * too many hues for a pie; status colours carry meaning, labels carry identity).
 */
export function BarList({
  rows,
  format,
}: {
  rows: { key: string; label: React.ReactNode; value: number; color: string }[];
  format: (v: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} className="group">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
            <span className="text-ink font-medium">{r.label}</span>
            <span className="text-muted num">
              <span className="text-ink font-semibold">{format(r.value)}</span> ·{' '}
              {Math.round((r.value / total) * 100)}%
            </span>
          </div>
          <div className="bg-well h-2 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${(r.value / max) * 100}%`, background: r.color }}
              title={`${format(r.value)}`}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
