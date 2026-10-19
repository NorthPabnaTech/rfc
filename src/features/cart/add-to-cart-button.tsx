'use client';

import { useCart } from '@/stores/cart-store';
import type { ProductCardDTO } from '@/types';
import { Icon } from '@components/icon/icon';
import { cn } from '@lib/utils';

/**
 * The card's main action. Products with options (size, colour…) are added
 * without them; the cart drawer then asks for the missing choices, and
 * checkout stays blocked until they're made.
 */
export function AddToCartButton({
  product,
  className,
}: {
  product: ProductCardDTO;
  className?: string;
}) {
  const add = useCart((s) => s.add);
  const soldOut = product.stockStatus === 'out_of_stock';
  const base = cn(
    'focus-ring flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold transition',
    className,
  );

  if (soldOut) {
    return (
      <button type="button" disabled className={cn(base, 'bg-well text-subtle cursor-not-allowed')}>
        Sold out
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={`Add ${product.name} to cart`}
      className={cn(base, 'bg-noir hover:bg-brand hover:text-brand-contrast text-white')}
      onClick={(e) => {
        e.preventDefault();
        add({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          image: product.image,
          price: product.effectivePrice,
          variant: {},
          quantity: 1,
        });
      }}
    >
      <Icon name="bag" size={15} /> Add to cart
    </button>
  );
}
