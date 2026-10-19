import Link from 'next/link';

import { AddToCartButton } from '@/features/cart/add-to-cart-button';
import { WishlistButton } from '@/features/wishlist/wishlist-button';
import type { ProductCardDTO } from '@/types';
import { cn } from '@lib/utils';

import { discountPercent, Price } from './price';
import { ProductImage } from './product-image';
import { RatingStars } from './rating-stars';

type Props = {
  product: ProductCardDTO;
  /** Eager-load the image (first row above the fold). */
  priority?: boolean;
  className?: string;
};

const SIZES = '(min-width: 1280px) 240px, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw';

/**
 * Store product card: image (second image on hover), discount and combo
 * badges, wishlist heart, name, rating, price and an add-to-cart action.
 */
export function ProductCard({ product, priority, className }: Props) {
  const off = discountPercent(product.price, product.salePrice);
  const soldOut = product.stockStatus === 'out_of_stock';
  const href = `/products/${product.slug}`;

  return (
    <article
      className={cn(
        'group border-line hover:shadow-pop relative flex flex-col overflow-hidden rounded-xl border bg-white transition duration-300 hover:-translate-y-0.5',
        className,
      )}
    >
      <div className="bg-cream relative aspect-square overflow-hidden">
        <Link
          href={href}
          className="absolute inset-0 block"
          aria-label={product.name}
          tabIndex={-1}
        >
          <ProductImage
            src={product.image?.url}
            alt={product.image?.alt ?? product.name}
            fill
            priority={priority}
            sizes={SIZES}
            className={cn(
              'transition duration-500 ease-out group-hover:scale-105',
              product.hoverImage && 'group-hover:opacity-0',
              soldOut && 'opacity-60',
            )}
          />
          {product.hoverImage && (
            <ProductImage
              src={product.hoverImage.url}
              alt=""
              fill
              sizes={SIZES}
              className="opacity-0 transition duration-500 ease-out group-hover:scale-105 group-hover:opacity-100"
            />
          )}
        </Link>

        <div className="pointer-events-none absolute top-2.5 left-2.5 flex flex-col items-start gap-1">
          {off > 0 && (
            <span className="rounded-md bg-[var(--status-danger-fg)] px-2 py-0.5 text-[11px] font-bold text-white">
              -{off}%
            </span>
          )}
          {product.isCombo && (
            <span className="bg-noir text-brand-300 rounded-md px-2 py-0.5 text-[11px] font-bold">
              Combo · {product.comboCount} items
            </span>
          )}
          {product.stockStatus === 'pre_order' && (
            <span className="bg-brand text-brand-contrast rounded-md px-2 py-0.5 text-[11px] font-semibold">
              Pre-order
            </span>
          )}
          {soldOut && (
            <span className="bg-ink rounded-md px-2 py-0.5 text-[11px] font-semibold text-white">
              Sold out
            </span>
          )}
        </div>
        <WishlistButton
          productId={product.id}
          name={product.name}
          className="absolute top-2.5 right-2.5"
        />
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        <h3 className="text-ink line-clamp-2 min-h-[2.6em] text-[13.5px] leading-snug font-medium">
          <Link href={href} className="hover:text-accent transition-colors">
            {product.name}
          </Link>
        </h3>
        <div className="mt-1.5 flex h-4 items-center gap-1.5">
          {product.ratingCount > 0 ? (
            <>
              <RatingStars value={product.ratingAverage} size={12} />
              <span className="text-subtle text-[11px]">({product.ratingCount})</span>
            </>
          ) : (
            <span className="text-subtle text-[11px]">New</span>
          )}
        </div>
        <Price price={product.price} salePrice={product.salePrice} size="sm" className="mt-1.5" />
        <AddToCartButton product={product} className="mt-3" />
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  className,
  priorityCount = 4,
}: {
  products: ProductCardDTO[];
  className?: string;
  priorityCount?: number;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5',
        className,
      )}
    >
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border-line overflow-hidden rounded-xl border bg-white">
          <div className="skeleton aspect-square rounded-none" />
          <div className="space-y-2 p-3">
            <div className="skeleton h-4 w-4/5" />
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-9" />
          </div>
        </div>
      ))}
    </div>
  );
}
