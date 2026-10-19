import { cn } from '@lib/utils';
import { formatNumber } from '@lib/utils/format';

type Props = {
  price: number;
  salePrice?: number | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const SIZE = {
  sm: { now: 'text-[15px]', was: 'text-[12px]' },
  md: { now: 'text-lg', was: 'text-[13px]' },
  lg: { now: 'text-[28px]', was: 'text-base' },
};

export function discountPercent(price: number, salePrice?: number | null): number {
  if (!salePrice || salePrice >= price) return 0;
  return Math.round(((price - salePrice) / price) * 100);
}

/** "৳1,250  ৳1,600" — current price in ink, original struck through. */
export function Price({ price, salePrice, size = 'md', className }: Props) {
  const onSale = !!salePrice && salePrice < price;
  const s = SIZE[size];
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-2', className)}>
      <span className={cn('text-ink font-bold tracking-tight', s.now)}>
        ৳{formatNumber(onSale ? salePrice : price)}
      </span>
      {onSale && (
        <span className={cn('text-subtle line-through', s.was)}>৳{formatNumber(price)}</span>
      )}
    </span>
  );
}

export function Taka({ amount, className }: { amount: number; className?: string }) {
  return <span className={className}>৳{formatNumber(amount)}</span>;
}
