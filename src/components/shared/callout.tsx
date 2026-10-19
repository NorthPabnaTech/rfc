import * as React from 'react';

import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { cn } from '@lib/utils';

/* ─────────────────────────────────────────────────────────────────────────
 * Callout — a colorful, tone-driven inline notice / summary strip.
 *
 * Unlike the gray `bg-well` panels, callouts lean on the status palette so
 * alerts (low stock, warnings, tips) read as colorful, not neutral.
 *
 *   <Callout tone="warn" icon="alert" title="3 ingredients below alert level" />
 *   <Callout tone="info">The prepared item must already exist in Ingredients.</Callout>
 * ──────────────────────────────────────────────────────────────────────── */

export type CalloutTone = 'info' | 'success' | 'warn' | 'danger' | 'accent' | 'neutral';

const TONE: Record<CalloutTone, { bg: string; fg: string; icon: IconRegistryKey }> = {
  info: { bg: '--status-info-bg', fg: '--status-info-fg', icon: 'info' },
  success: { bg: '--status-ok-bg', fg: '--status-ok-fg', icon: 'checkCircle' },
  warn: { bg: '--status-warn-bg', fg: '--status-warn-fg', icon: 'alert' },
  danger: { bg: '--status-danger-bg', fg: '--status-danger-fg', icon: 'alert' },
  accent: { bg: '--color-accent-soft', fg: '--color-accent', icon: 'sparkles' },
  neutral: { bg: '--color-well', fg: '--color-muted', icon: 'info' },
};

type Props = {
  tone?: CalloutTone;
  /** Override the leading icon. Pass `null` to hide it. */
  icon?: IconRegistryKey | null;
  /** Bold lead line. */
  title?: React.ReactNode;
  /** Supporting copy (or pass plain children). */
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Right-aligned action (button / link). */
  action?: React.ReactNode;
  /** Compact = single dense line, no icon chip. */
  compact?: boolean;
  className?: string;
};

export function Callout({
  tone = 'info',
  icon,
  title,
  description,
  children,
  action,
  compact = false,
  className,
}: Props) {
  const t = TONE[tone];
  const iconName = icon === null ? null : (icon ?? t.icon);
  const body = description ?? children;

  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-3 rounded-xl px-3.5 py-3',
        compact && 'gap-2.5 px-3 py-2.5',
        className,
      )}
      style={{
        background: `var(${t.bg})`,
        color: `var(${t.fg})`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklch, var(${t.fg}) 16%, transparent)`,
      }}
    >
      {iconName && (
        <span
          className={cn(
            'grid shrink-0 place-items-center rounded-lg',
            compact ? 'mt-px h-5 w-5' : 'h-7 w-7',
          )}
          style={{ background: `color-mix(in oklch, var(${t.fg}) 12%, transparent)` }}
          aria-hidden
        >
          <Icon name={iconName} size={compact ? 13 : 15} stroke={1.9} />
        </span>
      )}

      <div className="min-w-0 flex-1">
        {title && <p className="text-[13px] font-semibold tracking-tight">{title}</p>}
        {body && (
          <p className={cn('text-[12.5px] leading-relaxed', title && 'mt-0.5 opacity-90')}>
            {body}
          </p>
        )}
      </div>

      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}
