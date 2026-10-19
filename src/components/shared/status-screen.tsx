import * as React from 'react';

import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { cn } from '@lib/utils';

type Tone = 'neutral' | 'danger';

type Props = {
  /** Short eyebrow, e.g. "Error 404" or "500". */
  code?: string;
  icon?: IconRegistryKey;
  tone?: Tone;
  title: string;
  description?: React.ReactNode;
  /** Action buttons row. */
  actions?: React.ReactNode;
  className?: string;
};

const TONE: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: '--color-well', fg: '--color-muted' },
  danger: { bg: '--status-danger-bg', fg: '--status-danger-fg' },
};

/**
 * Full-screen status page (404 / errors). Minimal, modern, on-brand: a tone
 * medallion over a soft accent glow, a code eyebrow, title, description and an
 * actions row. Server-safe (no hooks) so error boundaries can reuse it.
 */
export function StatusScreen({
  code,
  icon = 'alert',
  tone = 'neutral',
  title,
  description,
  actions,
  className,
}: Props) {
  const t = TONE[tone];
  return (
    <main
      className={cn(
        'bg-surface relative grid min-h-svh place-items-center overflow-hidden px-6 py-12',
        className,
      )}
    >
      {/* soft accent glow backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color-mix(in_oklch,var(--color-accent)_10%,transparent)] blur-3xl" />
      </div>

      <div className="relative w-full max-w-md text-center">
        {/* medallion */}
        <span
          className="mx-auto grid h-14 w-14 place-items-center rounded-2xl"
          style={{
            background: `var(${t.bg})`,
            color: `var(${t.fg})`,
            boxShadow: `0 0 0 6px color-mix(in oklch, var(${t.fg}) 8%, transparent)`,
          }}
          aria-hidden="true"
        >
          <Icon name={icon} size={26} stroke={1.8} />
        </span>

        {code && (
          <p className="text-subtle mt-6 text-[12px] font-semibold tracking-[0.18em] uppercase">
            {code}
          </p>
        )}
        <h1 className="text-ink mt-2 text-[24px] font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted mx-auto mt-2.5 max-w-sm text-[13px] leading-relaxed">
            {description}
          </p>
        )}

        {actions && (
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">{actions}</div>
        )}
      </div>
    </main>
  );
}
