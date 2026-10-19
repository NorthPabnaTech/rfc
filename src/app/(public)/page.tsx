import { ProductGrid } from '@/features/products/product-card';
import { BannerCard } from '@/features/promotions/banner-card';
import { getActiveBanners } from '@/services/banners';
import { getCategoryTree } from '@/services/catalog';
import { listFeaturedReviews } from '@/services/engagement';
import { listProductCards } from '@/services/products';
import type { BannerDTO, ProductCardDTO } from '@/types';
import type { IconRegistryKey } from '@components/icon/icon';

import { CategoryRail } from './components/home/category-rail';
import { HeroBanners } from './components/home/hero-banners';
import { ReviewsSection } from './components/home/reviews-section';
import { SectionHeading } from './components/home/section-heading';
import { ServiceStrip } from './components/home/service-strip';

/**
 * Homepage, in standard storefront order:
 * hero banners → services → categories → featured → new arrivals →
 * discounts → combos → special offer banner → popular → reviews.
 */
export default async function HomePage() {
  const [banners, categories, featured, fresh, deals, combos, popular, reviews] = await Promise.all(
    [
      getActiveBanners(),
      getCategoryTree(),
      listProductCards('featured', 10),
      listProductCards('new', 10),
      listProductCards('deals', 10),
      listProductCards('combos', 5),
      listProductCards('bestsellers', 10),
      listFeaturedReviews(6),
    ],
  );
  const isEmpty = !featured.length && !fresh.length;

  return (
    <div className="bg-surface pb-4">
      <HeroBanners hero={banners.hero} side={banners.hero_side} />
      <ServiceStrip />
      <CategoryRail categories={categories} />

      <ProductSection
        title="Featured products"
        subtitle="Hand-picked by our team"
        icon="sparkles"
        href="/products"
        products={featured}
        priority
      />
      <ProductSection
        title="New arrivals"
        subtitle="Fresh products just added"
        icon="clock"
        href="/products?sort=newest"
        products={fresh}
      />
      <ProductSection
        title="Hot deals"
        subtitle="Big discounts on top picks"
        icon="discount"
        href="/products?onSale=1"
        products={deals}
      />
      <ProductSection
        title="Combo offers"
        subtitle="Buy together and save more"
        icon="layers"
        href="/combo-offers"
        products={combos}
      />

      <SpecialOffers banners={banners.special} />

      <ProductSection
        title="Popular products"
        subtitle="What everyone’s buying"
        icon="trend"
        href="/products?sort=popular"
        products={popular}
      />

      <ReviewsSection reviews={reviews} />

      {isEmpty && (
        <section className="container-page py-16 text-center">
          <p className="font-display text-ink text-2xl">New products are arriving soon.</p>
          <p className="text-muted mt-2">Check back shortly — our catalog is being stocked.</p>
        </section>
      )}
    </div>
  );
}

function ProductSection({
  title,
  subtitle,
  icon,
  href,
  products,
  priority = false,
}: {
  title: string;
  subtitle: string;
  icon: IconRegistryKey;
  href: string;
  products: ProductCardDTO[];
  priority?: boolean;
}) {
  if (products.length === 0) return null;
  return (
    <section className="container-page pt-10 sm:pt-12">
      <SectionHeading title={title} subtitle={subtitle} icon={icon} href={href} />
      <ProductGrid products={products} priorityCount={priority ? 5 : 0} />
    </section>
  );
}

/** Mid-page campaign banner(s) — admin "special" banners, or a default promo. */
function SpecialOffers({ banners }: { banners: BannerDTO[] }) {
  const items = banners.length
    ? banners.slice(0, 2).map((b) => ({
        key: b.id,
        title: b.title,
        description: b.description,
        eyebrow: b.eyebrow,
        ctaLabel: b.ctaLabel,
        link: b.link,
        imageUrl: b.image.url,
      }))
    : [
        {
          key: 'default',
          eyebrow: 'Special offer',
          title: 'Big savings on bestsellers',
          description: 'Limited-time prices on customer favourites — while stocks last.',
          ctaLabel: 'Grab the deals',
          link: '/products?onSale=1',
        },
      ];

  return (
    <section className="container-page pt-10 sm:pt-12" aria-label="Special offers">
      <div className={items.length > 1 ? 'grid gap-3 sm:gap-4 md:grid-cols-2' : ''}>
        {items.map(({ key, ...b }) => (
          <BannerCard
            key={key}
            {...b}
            size="lg"
            sizes={items.length > 1 ? '(min-width: 768px) 50vw, 100vw' : '100vw'}
            className="aspect-[16/9] sm:aspect-[3/1] md:aspect-auto md:min-h-[260px]"
          />
        ))}
      </div>
    </section>
  );
}
