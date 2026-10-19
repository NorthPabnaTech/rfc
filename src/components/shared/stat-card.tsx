import * as React from 'react';

import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { cn } from '@lib/utils';

/* ─────────────────────────────────────────────────────────────────────────
 * StatCard — a KPI stat tile: label above, value below, optional hint line
 * and a tone-tinted icon medallion. The value always wears ink (text tokens,
 * never a series color); `tone` colors only the medallion.
 *
 * Pass `onClick` (+ `active`) to use tiles as clickable status filters
 * (e.g. the order-status filter cards).
 *
 *   <StatCardGrid>
 *     <StatCard label="Total employees" value="13" icon="users" />
 *     <StatCard label="Pending approvals" value="7" icon="inbox" tone="warn" />
 *   </StatCardGrid>
 * ──────────────────────────────────────────────────────────────────────── */

export type StatCardTone = 'accent' | 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'locked';

const TONE: Record<StatCardTone, { bg: string; fg: string }> = {
  accent: { bg: 'var(--color-accent-soft)', fg: 'var(--color-accent)' },
  ok: { bg: 'var(--status-ok-bg)', fg: 'var(--status-ok-fg)' },
  warn: { bg: 'var(--status-warn-bg)', fg: 'var(--status-warn-fg)' },
  danger: { bg: 'var(--status-danger-bg)', fg: 'var(--status-danger-fg)' },
  info: { bg: 'var(--status-info-bg)', fg: 'var(--status-info-fg)' },
  neutral: { bg: 'var(--color-well)', fg: 'var(--color-muted)' },
  locked: { bg: '#eef2ff', fg: '#4f46e5' },
};

type Props = {
  /** Sentence-case label, no trailing colon. */
  label: string;
  value: React.ReactNode;
  /** Small supporting line under the value (e.g. "June 2026 net"). */
  hint?: React.ReactNode;
  icon?: IconRegistryKey;
  /** Colors the icon medallion only — the value always stays ink. */
  tone?: StatCardTone;
  /** Renders the tile as a button (e.g. a status filter). */
  onClick?: () => void;
  /** Highlight when the tile is the active filter. */
  active?: boolean;
  className?: string;
};

export function StatCard({ label, value, hint, icon, tone = 'accent', ...rest }: Props) {
  const { onClick, active, className } = rest;
  const t = TONE[tone];

  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="type-caption text-muted truncate">{label}</p>
        <p className="text-ink mt-1 truncate text-[21px] leading-tight font-semibold tracking-tight">
          {value}
        </p>
        {hint && <p className="text-subtle mt-1 truncate text-[12px]">{hint}</p>}
      </div>

      {icon && (
        <span
          aria-hidden="true"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
          style={{ background: t.bg, color: t.fg }}
        >
          <Icon name={icon} size={17} stroke={1.8} />
        </span>
      )}
    </>
  );

  const base = cn(
    'bg-panel hairline flex items-start gap-3 rounded-xl px-4 py-3.5 text-left',
    onClick && 'focus-ring hover:border-line-2 cursor-pointer transition-colors',
    active && 'ring-accent/40 border-accent/40 ring-1',
    className,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={base}>
        {body}
      </button>
    );
  }
  return <div className={base}>{body}</div>;
}

/**
 * The stat-tile row that sits above a table.
 *
 * From `lg` up it flows as a single row of equal-width columns
 * (`grid-flow-col` + `auto-cols-fr`), so four tiles and seven tiles are spaced
 * identically without anyone declaring a column count. Below `lg` it falls
 * back to a wrapping 2/3-column grid.
 */
export function StatCardGrid({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:auto-cols-fr lg:grid-flow-col',
        className,
      )}
    >
      {children}
    </div>
  );
}
