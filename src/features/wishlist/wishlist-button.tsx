'use client';

import { useWishlist } from '@/stores/wishlist-store';
import { useHydrated } from '@hooks/use-hydrated';
import { toast } from '@lib/toast';
import { cn } from '@lib/utils';

/** Heart toggle. `floating` = round white button over a product image. */
export function WishlistButton({
  productId,
  name,
  variant = 'floating',
  className,
}: {
  productId: string;
  name: string;
  variant?: 'floating' | 'outline';
  className?: string;
}) {
  const hydrated = useHydrated();
  const saved = useWishlist((s) => s.ids.includes(productId));
  const toggle = useWishlist((s) => s.toggle);
  const on = hydrated && saved;

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const added = toggle(productId);
        toast.success(added ? 'Saved to wishlist' : 'Removed from wishlist');
      }}
      className={cn(
        'focus-ring grid place-items-center rounded-full transition',
        variant === 'floating'
          ? 'size-9 bg-white/95 shadow-sm backdrop-blur hover:scale-105'
          : 'border-line-2/70 hover:border-ink size-12 border bg-white',
        on ? 'text-[var(--status-danger-fg)]' : 'text-ink/70 hover:text-ink',
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        width={variant === 'floating' ? 17 : 20}
        height={variant === 'floating' ? 17 : 20}
        fill={on ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={1.8}
        aria-hidden
      >
        <path d="M12 20.5s-7.5-4.6-9.3-9.4C1.5 7.8 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.5 3.3 4.3 6.6-1.8 4.8-9.3 9.4-9.3 9.4z" />
      </svg>
    </button>
  );
}
