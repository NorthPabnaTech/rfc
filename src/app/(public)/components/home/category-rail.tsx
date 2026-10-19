import Link from 'next/link';

import { ProductImage } from '@/features/products/product-image';
import type { CategoryTreeDTO } from '@/types';

import { SectionHeading } from './section-heading';

/** Horizontal, scrollable tiles (image or monogram) for the categories the
 * admin marked "Feature on homepage". */
export function CategoryRail({ categories }: { categories: CategoryTreeDTO[] }) {
  // Top-level categories first, then sub-categories.
  const tiles = [...categories, ...categories.flatMap((c) => c.children)]
    .filter((c) => c.isFeatured)
    .slice(0, 16);
  if (tiles.length === 0) return null;

  return (
    <section className="container-page pt-8 sm:pt-10">
      <SectionHeading
        title="Shop by category"
        icon="layers"
        href="/products"
        linkLabel="All products"
      />
      <ul className="scrollbar-hidden -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:px-0 md:grid-cols-6 xl:grid-cols-8">
        {tiles.map((c) => (
          <li key={c.id} className="w-[92px] shrink-0 snap-start sm:w-auto">
            <Link
              href={`/products?category=${c.slug}`}
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
    </section>
  );
}
