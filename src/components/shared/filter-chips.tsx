'use client';

import { cn } from '@lib/utils';

/** The tones a chip can take when selected. Maps to design-system tokens below. */
export type FilterChipVariant = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const VARIANTS: Record<FilterChipVariant, { bg: string; fg: string; dot: string }> = {
  accent: { bg: '--color-accent-soft', fg: '--color-accent', dot: '--color-accent' },
  success: { bg: '--status-ok-bg', fg: '--status-ok-fg', dot: '--status-ok-dot' },
  warning: { bg: '--status-warn-bg', fg: '--status-warn-fg', dot: '--status-warn-dot' },
  danger: { bg: '--status-danger-bg', fg: '--status-danger-fg', dot: '--status-danger-dot' },
  info: { bg: '--status-info-bg', fg: '--status-info-fg', dot: '--status-info-dot' },
  neutral: { bg: '--color-well', fg: '--color-muted', dot: '--color-subtle' },
};

/** One filter chip: a pill with a status dot, label, and an optional count badge. */
export type FilterChip<V extends string = string> = {
  value: V;
  label: string;
  /** Selected tone. Defaults to `accent`. */
  variant?: FilterChipVariant;
  /** Optional live count badge. */
  count?: number;
};

type Props<V extends string> = {
  chips: FilterChip<V>[];
  value: V;
  onChange: (value: V) => void;
  className?: string;
};

/**
 * FilterChips — a segmented, count-bearing chip filter. The selected chip fills
 * with its `variant` tone; the rest stay quiet outlines. Callers only pass
 * `{ label, value, variant?, count? }` — colors live in the variant map here.
 *
 * Responsive: on mobile the row does NOT wrap — it scrolls horizontally (no
 * scrollbar chrome) so a long set never stacks into a tall block. From `sm` up
 * it wraps normally.
 */
export function FilterChips<V extends string>({ chips, value, onChange, className }: Props<V>) {
  return (
    <div
      className={cn(
        'flex w-full items-center gap-2 overflow-x-auto pb-0.5',
        '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        'sm:w-auto sm:flex-wrap sm:overflow-visible sm:pb-0',
        className,
      )}
    >
      {chips.map((chip) => {
        const active = value === chip.value;
        const tone = VARIANTS[chip.variant ?? 'accent'];
        return (
          <button
            key={chip.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(chip.value)}
            className={cn(
              'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-medium transition-colors',
              active
                ? 'border-transparent'
                : 'border-line bg-panel text-muted hover:bg-well hover:text-ink',
            )}
            style={active ? { background: `var(${tone.bg})`, color: `var(${tone.fg})` } : undefined}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: active ? `var(${tone.dot})` : 'var(--color-subtle)' }}
            />
            {chip.label}
            {chip.count != null && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[10.5px] leading-[1.45] font-semibold tabular-nums',
                  !active && 'bg-well text-subtle',
                )}
                style={
                  active
                    ? {
                        background: `color-mix(in oklch, var(${tone.fg}) 18%, transparent)`,
                        color: `var(${tone.fg})`,
                      }
                    : undefined
                }
              >
                {chip.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
