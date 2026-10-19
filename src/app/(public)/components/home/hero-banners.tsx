import { BannerCard, type BannerContent } from '@/features/promotions/banner-card';
import type { BannerDTO } from '@/types';

import { HeroSlider } from './hero-slider';

const toContent = (b: BannerDTO): BannerContent & { id: string } => ({
  id: b.id,
  title: b.title,
  description: b.description,
  eyebrow: b.eyebrow,
  ctaLabel: b.ctaLabel,
  link: b.link,
  imageUrl: b.image.url,
});

/** Shown until the admin publishes banners (Admin → Banners). */
const DEFAULT_SLIDES: (BannerContent & { id: string })[] = [
  {
    id: 'default-1',
    eyebrow: 'New arrivals',
    title: 'Smart gadgets, delivered.',
    description: 'Phones, smart watches, earbuds and accessories — Cash on Delivery across Bangladesh.',
    ctaLabel: 'Shop now',
    link: '/products',
  },
  {
    id: 'default-2',
    eyebrow: 'Hot deals',
    title: 'Big savings on top picks',
    description: 'Discounted favourites, updated every week.',
    ctaLabel: 'View deals',
    link: '/products?onSale=1',
  },
];

const DEFAULT_SIDE: BannerContent[] = [
  {
    eyebrow: 'Bundles',
    title: 'Combo offers',
    description: 'Buy together, save more.',
    ctaLabel: 'Explore combos',
    link: '/combo-offers',
  },
  {
    eyebrow: 'Just in',
    title: 'New arrivals',
    description: 'Fresh picks added daily.',
    ctaLabel: 'See what’s new',
    link: '/products?sort=newest',
  },
];

/** Hero: rotating slider + two promo cards beside it on large screens. */
export function HeroBanners({ hero, side }: { hero: BannerDTO[]; side: BannerDTO[] }) {
  const slides = hero.length ? hero.map(toContent) : DEFAULT_SLIDES;
  const cards: BannerContent[] = side.length ? side.slice(0, 2).map(toContent) : DEFAULT_SIDE;

  return (
    <section className="container-page pt-4 sm:pt-6" aria-label="Promotions">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="aspect-[16/10] sm:aspect-[2/1] lg:aspect-auto lg:h-[420px]">
          <HeroSlider slides={slides} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-1 lg:grid-rows-2">
          {cards.map((c, i) => (
            <BannerCard
              key={i}
              {...c}
              size="md"
              sizes="(min-width: 1024px) 33vw, 50vw"
              className="aspect-[4/3] sm:aspect-[2/1] lg:aspect-auto lg:h-full"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
