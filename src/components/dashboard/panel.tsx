import Link from 'next/link';

import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { cn } from '@lib/utils';

/* Shared card surface: white panel, hairline border, a whisper of shadow. */
const CARD =
  'bg-panel border-line rounded-2xl border shadow-[0_1px_2px_rgb(2_48_71/0.04),0_6px_24px_-18px_rgb(2_48_71/0.18)]';

/** Rounded dashboard card with an optional title row. */
export function Panel({
  title,
  description,
  action,
  href,
  hrefLabel,
  children,
  className,
  bodyClassName,
  flush,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Shortcut for a "View all" link in the header. */
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** No body padding (tables, lists that run edge to edge). */
  flush?: boolean;
}) {
  const hasHeader = !!(title || action || href);
  return (
    <section className={cn(CARD, 'flex min-w-0 flex-col', className)}>
      {hasHeader && (
        <header
          className={cn(
            'flex items-start justify-between gap-4 px-5 pt-5 sm:px-6',
            flush ? 'border-line border-b pb-4' : 'pb-4',
          )}
        >
          <div className="min-w-0">
            {title && <h2 className="type-card-title text-ink">{title}</h2>}
            {description && <p className="type-helper text-muted mt-1">{description}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {action}
            {href && (
              <Link
                href={href}
                className="text-accent hover:bg-accent-soft focus-ring -mr-2 inline-flex items-center gap-0.5 rounded-lg px-2 py-1 text-[13px] font-semibold transition-colors"
              >
                {hrefLabel}
                <Icon name="chevRight" size={15} />
              </Link>
            )}
          </div>
        </header>
      )}
      <div
        className={cn(
          'min-w-0 flex-1',
          !flush && (hasHeader ? 'px-5 pb-6 sm:px-6' : 'p-5 sm:p-6'),
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

export type KpiTone = 'brand' | 'sun' | 'ok' | 'danger' | 'info' | 'navy' | 'violet' | 'warn';

const TONE: Record<
  KpiTone,
  { bg: string; fg: string; cardGradient: string; cardBorder: string }
> = {
  brand: {
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
  sun: {
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
  navy: {
    bg: 'linear-gradient(135deg, #64748b, #475569)',
    fg: '#ffffff',
    cardGradient:
      'linear-gradient(135deg, color-mix(in srgb, #64748b 16%, var(--color-panel)), color-mix(in srgb, #334155 8%, var(--color-panel)))',
    cardBorder: 'color-mix(in srgb, #64748b 28%, var(--color-line))',
  },
  violet: {
    bg: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    fg: '#ffffff',
    cardGradient:
      'linear-gradient(135deg, color-mix(in srgb, #6366f1 18%, var(--color-panel)), color-mix(in srgb, #8b5cf6 8%, var(--color-panel)))',
    cardBorder: 'color-mix(in srgb, #6366f1 32%, var(--color-line))',
  },
};

/**
 * Metric card: matches `StatCard` (gradient surface + gradient icon medallion).
 */
export function KpiCard({
  label,
  value,
  icon,
  tone = 'brand',
  hint,
  delta,
  href,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  icon: IconRegistryKey;
  tone?: KpiTone;
  hint?: React.ReactNode;
  /** Percentage change; positive renders green, negative red. */
  delta?: { value: number; label: string; text: string } | null;
  href?: string;
  className?: string;
}) {
  const t = TONE[tone];
  const body = (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="type-caption text-muted truncate">{label}</p>
        <p className="num text-ink mt-1 truncate text-[21px] leading-tight font-semibold tracking-tight">
          {value}
        </p>
        {(delta || hint) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {delta && (
              <span
                className={cn(
                  'num inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
                  delta.value >= 0
                    ? 'bg-[var(--status-ok-bg)] text-[var(--status-ok-fg)]'
                    : 'bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]',
                )}
              >
                <Icon name={delta.value >= 0 ? 'chevUp' : 'chevDown'} size={12} />
                {delta.text}
              </span>
            )}
            <span className="text-subtle truncate text-[12px]">{hint ?? delta?.label}</span>
          </div>
        )}
      </div>
      <span
        aria-hidden="true"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
        style={{ background: t.bg, color: t.fg }}
      >
        <Icon name={icon} size={17} stroke={1.8} />
      </span>
    </div>
  );
  const cls = cn(
    'block min-w-0 rounded-xl border px-4 py-3.5 text-left shadow-xs transition-[transform,box-shadow,border-color]',
    href && 'focus-ring hover:-translate-y-0.5 hover:shadow-md',
    className,
  );
  const style = { backgroundImage: t.cardGradient, borderColor: t.cardBorder };
  return href ? (
    <Link href={href} className={cls} style={style}>
      {body}
    </Link>
  ) : (
    <div className={cls} style={style}>
      {body}
    </div>
  );
}

export function KpiGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4', className)}>
      {children}
    </div>
  );
}
