'use client';

import { useI18n } from '@/i18n/provider';
import { cn } from '@lib/utils';

/** Taka amount in the active language (Bangla numerals use Anek Bangla). */
export function Money({
  value,
  signed,
  compact,
  tone,
  className,
}: {
  value: number;
  /** Show "+" on positive values. */
  signed?: boolean;
  compact?: boolean;
  /** Colour by sign: green credit, red debit. */
  tone?: 'auto';
  className?: string;
}) {
  const { money } = useI18n();
  return (
    <span
      className={cn(
        'num whitespace-nowrap',
        tone === 'auto' && value > 0 && 'text-[var(--status-ok-fg)]',
        tone === 'auto' && value < 0 && 'text-[var(--status-danger-fg)]',
        className,
      )}
    >
      {money(value, { signed, compact })}
    </span>
  );
}

/** Plain number in the active language. */
export function Num({ value, className }: { value: number; className?: string }) {
  const { num } = useI18n();
  return <span className={cn('num', className)}>{num(value)}</span>;
}
