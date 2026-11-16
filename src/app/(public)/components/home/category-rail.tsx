'use client';

import Link from 'next/link';

import { ProductImage } from '@/features/products/product-image';
import type { CategoryTreeDTO } from '@/types';

import { CarouselControls, useInfiniteCarousel } from './infinite-carousel';
import { SectionHeading } from './section-heading';

/** Single-row, infinitely scrollable category tiles for "Feature on homepage" categories. */
export function CategoryRail({ categories }: { categories: CategoryTreeDTO[] }) {
  // Top-level categories first, then sub-categories.
  const tiles = [...categories, ...categories.flatMap((c) => c.children)]
    .filter((c) => c.isFeatured)
    .slice(0, 24);

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
  } = useInfiniteCarousel(tiles.length);

  if (tiles.length === 0) return null;

  return (
    <section className="container-page pt-8 sm:pt-10">
      <SectionHeading
        title="Shop by category"
        subtitle="Explore our curated collections"
        icon="layers"
        rightExtra={
          <CarouselControls
            visible={overflowing}
            onPrev={() => scrollByStep(-1)}
            onNext={() => scrollByStep(1)}
            label="categories"
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
        className="scrollbar-hidden -mx-4 flex cursor-grab flex-nowrap gap-3 overflow-x-auto px-4 py-1 select-none active:cursor-grabbing sm:mx-0 sm:gap-4 sm:px-0"
      >
        {copies.map((copyIdx) => (
          <ul
            key={copyIdx}
            data-carousel-set={copyIdx}
            aria-hidden={copyIdx !== 0 || undefined}
            className="flex shrink-0 flex-nowrap gap-3 sm:gap-4"
          >
            {tiles.map((c) => (
              <li
                key={`${copyIdx}-${c.id}`}
                className="w-[108px] shrink-0 sm:w-[130px] lg:w-[140px]"
              >
                <Link
                  href={`/products?category=${c.slug}`}
                  draggable={false}
                  tabIndex={copyIdx !== 0 ? -1 : undefined}
                  className="group border-line hover:border-brand-300 hover:bg-brand-50/30 hover:shadow-pop flex h-full flex-col items-center justify-center gap-2 rounded-2xl border bg-white px-2 py-3 text-center shadow-xs transition-all duration-300 hover:-translate-y-0.5 sm:px-2.5 sm:py-3.5"
                >
                  <span className="flex items-center justify-center p-1 sm:p-1.5">
                    <span className="relative block size-10 sm:size-12">
                      {c.image ? (
                        <ProductImage
                          src={c.image.url}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-contain transition duration-300 group-hover:scale-110"
                        />
                      ) : (
                        <span className="font-display text-brand-600 grid size-full place-items-center text-xl font-semibold">
                          {c.name.charAt(0)}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="text-ink group-hover:text-brand-700 w-full truncate px-0.5 text-[11px] leading-tight font-semibold transition-colors sm:text-[12px]">
                    {c.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
