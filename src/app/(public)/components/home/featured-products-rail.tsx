'use client';

import { ProductCard } from '@/features/products/product-card';
import type { ProductCardDTO } from '@/types';

import { CarouselControls, useInfiniteCarousel } from './infinite-carousel';
import { SectionHeading } from './section-heading';

/** Single-row, infinitely scrollable Featured products rail. */
export function FeaturedProductsRail({ products }: { products: ProductCardDTO[] }) {
  const {
    trackRef,
    overflowing,
    copies,
    onScroll,
    scrollByStep,
    onMouseDown,
    onTouchStart,
    onTouchEnd,
    onClickCapture,
  } = useInfiniteCarousel(products.length, { autoScrollMobileMs: 5000 });

  if (products.length === 0) return null;

  return (
    <section className="container-page pt-10 sm:pt-12">
      <SectionHeading
        title="Featured products"
        subtitle="Hand-picked by our team"
        icon="sparkles"
        href="/products"
        rightExtra={
          <CarouselControls
            visible={overflowing}
            onPrev={() => scrollByStep(-1)}
            onNext={() => scrollByStep(1)}
            label="featured products"
          />
        }
      />
      <div
        ref={trackRef}
        onScroll={onScroll}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onClickCapture={onClickCapture}
        className="scrollbar-hidden -mx-4 flex cursor-grab flex-nowrap gap-3 overflow-x-auto px-4 pb-1 select-none active:cursor-grabbing sm:mx-0 sm:gap-4 sm:px-0"
      >
        {copies.map((copyIdx) => (
          <div
            key={copyIdx}
            data-carousel-set={copyIdx}
            aria-hidden={copyIdx !== 0 || undefined}
            className="flex shrink-0 flex-nowrap gap-3 sm:gap-4"
          >
            {products.map((p, i) => (
              <div
                key={`${copyIdx}-${p.id}`}
                className="w-[172px] shrink-0 sm:w-[216px] lg:w-[234px]"
              >
                <ProductCard product={p} priority={copyIdx === 0 && i < 5} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
