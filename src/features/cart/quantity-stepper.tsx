'use client';

import { MAX_QTY } from '@/stores/cart-store';
import { Icon } from '@components/icon/icon';
import { cn } from '@lib/utils';

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'lg';
  className?: string;
};

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = MAX_QTY,
  size = 'lg',
  className,
}: Props) {
  const btn = cn(
    'grid place-items-center text-ink transition-colors hover:bg-well disabled:opacity-30 disabled:hover:bg-transparent',
    size === 'sm' ? 'size-7' : 'size-11',
  );
  return (
    <div
      className={cn(
        'border-line-2/60 inline-flex items-center rounded-full border bg-white',
        size === 'sm' ? 'h-8' : 'h-12',
        className,
      )}
    >
      <button
        type="button"
        className={cn(btn, 'rounded-l-full')}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <Icon name="minus" size={size === 'sm' ? 13 : 16} />
      </button>
      <span
        className={cn(
          'text-ink text-center font-semibold tabular-nums',
          size === 'sm' ? 'w-6 text-[13px]' : 'w-8',
        )}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        className={cn(btn, 'rounded-r-full')}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <Icon name="plus" size={size === 'sm' ? 13 : 16} />
      </button>
    </div>
  );
}
