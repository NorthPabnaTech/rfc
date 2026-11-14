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
    onClickCapture,
  } = useInfiniteCarousel(tiles.length);

  if (tiles.length === 0) return null;

  return (
    <section className="container-page pt-8 sm:pt-10">
      <SectionHeading
        title="Shop by category"
        icon="layers"
        href="/products"
        linkLabel="All products"
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
        onClickCapture={onClickCapture}
        className="scrollbar-hidden -mx-4 flex cursor-grab touch-pan-x flex-nowrap gap-3 overflow-x-auto px-4 pb-1 select-none active:cursor-grabbing sm:mx-0 sm:gap-4 sm:px-0"
      >
        {copies.map((copyIdx) => (
          <ul
            key={copyIdx}
            data-carousel-set={copyIdx}
            aria-hidden={copyIdx !== 0 || undefined}
            className="flex shrink-0 flex-nowrap gap-3 sm:gap-4"
          >
            {tiles.map((c) => (
              <li key={`${copyIdx}-${c.id}`} className="w-[104px] shrink-0 sm:w-[138px] lg:w-[146px]">
                <Link
                  href={`/products?category=${c.slug}`}
                  draggable={false}
                  tabIndex={copyIdx !== 0 ? -1 : undefined}
                  className="group border-line hover:border-brand-300 hover:shadow-pop flex h-full flex-col items-center gap-2.5 rounded-xl border bg-white p-3 text-center transition"
                >
                  <span className="bg-cream relative grid size-16 place-items-center overflow-hidden rounded-full sm:size-[72px]">
                    {c.image ? (
                      <ProductImage
                        src={c.image.url}
                        alt=""
                        fill
                        sizes="72px"
                        className="transition duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <span className="font-display text-brand-600 text-2xl font-semibold">
                        {c.name.charAt(0)}
                      </span>
                    )}
                  </span>
                  <span className="text-ink line-clamp-2 text-[12.5px] leading-tight font-medium">
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
