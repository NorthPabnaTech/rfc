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

const TONE: Record<
  StatCardTone,
  { bg: string; fg: string; cardGradient: string; cardBorder: string }
> = {
  accent: {
    bg: 'linear-gradient(135deg, #1170f5, #19c6ff)',
    fg: '#ffffff',
    cardGradient:
      'linear-gradient(135deg, color-mix(in srgb, #1170f5 18%, var(--color-panel)), color-mix(in srgb, #19c6ff 8%, var(--color-panel)))',
    cardBorder: 'color-mix(in srgb, #1170f5 32%, var(--color-line))',
  },
  ok: {
    bg: 'linear-gradient(135deg, #10b981, #14b8a6)',
    fg: '#ffffff',
    cardGradient:
      'linear-gradient(135deg, color-mix(in srgb, #10b981 18%, var(--color-panel)), color-mix(in srgb, #14b8a6 8%, var(--color-panel)))',
    cardBorder: 'color-mix(in srgb, #10b981 32%, var(--color-line))',
  },
  warn: {
    bg: 'linear-gradient(135deg, #f59e0b, #f97316)',
    fg: '#ffffff',
    cardGradient:
      'linear-gradient(135deg, color-mix(in srgb, #f59e0b 18%, var(--color-panel)), color-mix(in srgb, #f97316 8%, var(--color-panel)))',
    cardBorder: 'color-mix(in srgb, #f59e0b 32%, var(--color-line))',
  },
  danger: {
    bg: 'linear-gradient(135deg, #f43f5e, #ef4444)',
    fg: '#ffffff',
    cardGradient:
      'linear-gradient(135deg, color-mix(in srgb, #f43f5e 18%, var(--color-panel)), color-mix(in srgb, #ef4444 8%, var(--color-panel)))',
    cardBorder: 'color-mix(in srgb, #f43f5e 32%, var(--color-line))',
  },
  info: {
    bg: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
    fg: '#ffffff',
    cardGradient:
      'linear-gradient(135deg, color-mix(in srgb, #0ea5e9 18%, var(--color-panel)), color-mix(in srgb, #6366f1 8%, var(--color-panel)))',
    cardBorder: 'color-mix(in srgb, #0ea5e9 32%, var(--color-line))',
  },
  neutral: {
    bg: 'linear-gradient(135deg, #64748b, #475569)',
    fg: '#ffffff',
    cardGradient:
      'linear-gradient(135deg, color-mix(in srgb, #64748b 16%, var(--color-panel)), color-mix(in srgb, #334155 8%, var(--color-panel)))',
    cardBorder: 'color-mix(in srgb, #64748b 28%, var(--color-line))',
  },
  locked: {
    bg: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    fg: '#ffffff',
    cardGradient:
      'linear-gradient(135deg, color-mix(in srgb, #6366f1 18%, var(--color-panel)), color-mix(in srgb, #8b5cf6 8%, var(--color-panel)))',
    cardBorder: 'color-mix(in srgb, #6366f1 32%, var(--color-line))',
  },
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
    'flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left shadow-xs transition-[transform,box-shadow,border-color]',
    onClick && 'focus-ring cursor-pointer hover:-translate-y-0.5 hover:shadow-md',
    active && 'shadow-[0_10px_28px_-6px_rgba(56,189,248,0.28)]',
    className,
  );
  const style: React.CSSProperties = {
    background: t.cardGradient,
    borderColor: t.cardBorder,
  };

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={base} style={style}>
        {body}
      </button>
    );
  }
  return (
    <div className={base} style={style}>
      {body}
    </div>
  );
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
