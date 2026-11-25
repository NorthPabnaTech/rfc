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

const TONE: Record<KpiTone, string> = {
  brand: 'bg-brand-soft text-brand-ink',
  sun: 'bg-highlight-soft text-[var(--color-sun-600)] dark:text-[var(--color-sun-300)]',
  ok: 'bg-[var(--status-ok-bg)] text-[var(--status-ok-fg)]',
  danger: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]',
  info: 'bg-[var(--status-info-bg)] text-[var(--status-info-fg)]',
  warn: 'bg-[var(--status-warn-bg)] text-[var(--status-warn-fg)]',
  navy: 'bg-[#023047]/8 text-[#023047] dark:bg-white/8 dark:text-white',
  violet: 'bg-violet-500/12 text-violet-600 dark:text-violet-300',
};

/**
 * Metric card: label + icon on the top row, the value large underneath, then
 * an optional trend pill ("▲ 24% vs last month") or hint.
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
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted pt-0.5 text-[13.5px] leading-snug font-medium">{label}</p>
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', TONE[tone])}>
          <Icon name={icon} size={20} />
        </span>
      </div>
      <p className="num text-ink mt-2 text-[24px] leading-none font-semibold tracking-[-0.02em] sm:text-[28px]">
        {value}
      </p>
      {(delta || hint) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          {delta && (
            <span
              className={cn(
                'num inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[12px] font-semibold',
                delta.value >= 0
                  ? 'bg-[var(--status-ok-bg)] text-[var(--status-ok-fg)]'
                  : 'bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]',
              )}
            >
              <Icon name={delta.value >= 0 ? 'chevUp' : 'chevDown'} size={12} />
              {delta.text}
            </span>
          )}
          <span className="text-subtle text-[12.5px]">{hint ?? delta?.label}</span>
        </div>
      )}
    </>
  );
  const cls = cn(
    CARD,
    'block min-w-0 p-4 sm:p-5',
    href &&
      'focus-ring hover:border-brand-200 transition-[border-color,transform] hover:-translate-y-px dark:hover:border-brand-700',
    className,
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
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
