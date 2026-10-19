import { cn } from '@lib/utils';
import { formatNumber } from '@lib/utils/format';

export type BdtAmountProps = {
  amount: number | string | null | undefined;
  className?: string;
  bdtClassName?: string;
  amountClassName?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

/**
 * Global Currency Display Component.
 * Displays "BDT" one font-size smaller than the actual amount.
 * Amount uses Bangladesh/Indian comma grouping (e.g. 60,000 / 1,30,000 / 25,00,000).
 */
export function BdtAmount({
  amount,
  className,
  bdtClassName,
  amountClassName,
  minimumFractionDigits,
  maximumFractionDigits,
}: BdtAmountProps) {
  const formatted = formatNumber(amount, {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  return (
    <span className={cn('inline-flex items-baseline gap-1 font-mono leading-none', className)}>
      <span
        className={cn(
          'text-[calc(1em-1.5px)] font-semibold tracking-tight text-current uppercase select-none',
          bdtClassName,
        )}
      >
        BDT
      </span>
      <span className={cn('font-bold tracking-tight text-current', amountClassName)}>
        {formatted}
      </span>
    </span>
  );
}

/**
 * Formatted Number Component using Bangladesh/Indian-style comma grouping.
 */
export function FormattedNumber({
  value,
  className,
  minimumFractionDigits,
  maximumFractionDigits,
}: {
  value: number | string | null | undefined;
  className?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}) {
  return (
    <span className={className}>
      {formatNumber(value, { minimumFractionDigits, maximumFractionDigits })}
    </span>
  );
}
