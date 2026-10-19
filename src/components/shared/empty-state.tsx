import * as React from 'react';

import { cn } from '@lib/utils';

type Props = {
  /** Escape hatch for a fully custom illustration; defaults to `EmptyArt`. */
  illustration?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Compact removes the dashed panel + padding — for inline / small areas. */
  compact?: boolean;
  className?: string;
};

/*
 * Modern empty state: a single, system-wide illustration (`EmptyArt`) — a
 * softly-lit content sheet with a skeleton of "where data would go" plus an
 * accent medallion carrying the caller's contextual icon — over an airy dashed
 * panel. One cohesive design for every empty surface; the `icon` keeps it
 * contextual, `illustration` is the rare escape hatch.
 */
export function EmptyState({
  illustration,
  title,
  description,
  action,
  compact = false,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact
          ? 'gap-3 py-8'
          : 'bg-panel gap-4 rounded-xl border border-dashed border-[var(--color-line-2)] px-6 py-14',
        className,
      )}
    >
      {illustration ?? <EmptyArt />}

      <div className="space-y-1">
        <h3 className="type-card-title text-ink">{title}</h3>
        {description && <p className="type-helper text-muted mx-auto max-w-sm">{description}</p>}
      </div>

      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

/**
 * The shared empty-state illustration. A tilted "content sheet" with skeleton
 * rows sits on a soft backdrop; an accent medallion floats at the corner with
 * the contextual icon. Built entirely from theme tokens, so it tracks
 * light/dark and the brand coral automatically.
 */
function EmptyArt() {
  return (
    <div className="relative h-[100px] w-[132px]">
      <svg
        viewBox="0 0 132 100"
        fill="none"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      >
        {/* soft backdrop */}
        <ellipse cx="66" cy="54" rx="60" ry="44" fill="var(--color-well)" opacity="0.6" />

        {/* faded sheet behind, for a hint of depth */}
        <rect
          x="46"
          y="20"
          width="50"
          height="62"
          rx="11"
          fill="var(--color-panel)"
          stroke="var(--color-line)"
          strokeWidth="1.5"
          transform="rotate(8 66 50)"
          opacity="0.6"
        />

        {/* front sheet + skeleton rows */}
        <g transform="rotate(-5 64 52)">
          <rect
            x="38"
            y="18"
            width="52"
            height="66"
            rx="12"
            fill="var(--color-panel)"
            stroke="var(--color-line)"
            strokeWidth="1.5"
          />
          <g fill="var(--color-line-2)">
            <rect x="48" y="34" width="32" height="6" rx="3" />
            <rect x="48" y="47" width="24" height="6" rx="3" />
            <rect x="48" y="60" width="29" height="6" rx="3" />
          </g>
        </g>
      </svg>

      {/* accent medallion with the contextual icon */}
      {/* <span className="bg-accent-soft text-accent absolute right-1 bottom-1 grid h-10 w-10 place-items-center rounded-full shadow-sm ring-4 ring-[var(--color-panel)]">
        <Icon name={icon} size={19} stroke={1.8} />
      </span> */}
    </div>
  );
}
