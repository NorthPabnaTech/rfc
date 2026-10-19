import type { Metadata } from 'next';
import Link from 'next/link';

import { ProductGrid } from '@/features/products/product-card';
import { BannerCard } from '@/features/promotions/banner-card';
import { getActiveBanners } from '@/services/banners';
import { listCombos } from '@/services/combos';
import { Pager } from '@components/common/pager';
import { Icon } from '@components/icon/icon';
import { pageParam, type SearchParams } from '@lib/search-params';

export const metadata: Metadata = {
  title: 'Combo offers',
  description: 'Bundle deals at RFC Gadget — buy together and save, with Cash on Delivery.',
  alternates: { canonical: '/combo-offers' },
};

export default async function ComboOffersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const page = pageParam(await searchParams);
  const [result, banners] = await Promise.all([listCombos(page), getActiveBanners()]);
  const banner = banners.combo[0];

  return (
    <div className="bg-surface">
      <div className="container-page py-6 sm:py-8">
        <nav aria-label="Breadcrumb" className="text-muted mb-4 flex items-center gap-1.5 text-xs">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <Icon name="chevRight" size={11} />
          <span className="text-ink">Combo offers</span>
        </nav>

        <BannerCard
          size="lg"
          priority
          className="aspect-[16/9] sm:aspect-[3/1] lg:aspect-auto lg:h-[280px]"
          {...(banner
            ? {
                title: banner.title,
                description: banner.description,
                eyebrow: banner.eyebrow,
                ctaLabel: banner.ctaLabel,
                link: banner.link,
                imageUrl: banner.image.url,
              }
            : {
                eyebrow: 'Bundle & save',
                title: 'Combo offers',
                description:
                  'Hand-picked product bundles at a better price than buying separately.',
              })}
        />

        <div className="mt-8 mb-5 flex items-end justify-between gap-4">
          <div>
            <h1 className="type-display text-ink">All combo offers</h1>
            <p className="text-muted mt-1 text-sm">
              {result.total} {result.total === 1 ? 'bundle' : 'bundles'} available
            </p>
          </div>
        </div>

        {result.items.length > 0 ? (
          <>
            <ProductGrid products={result.items} />
            <Pager
              className="mt-10"
              page={result.page}
              pageCount={result.pageCount}
              hrefFor={(p) => (p === 1 ? '/combo-offers' : `/combo-offers?page=${p}`)}
            />
          </>
        ) : (
          <div className="border-line rounded-2xl border bg-white px-6 py-16 text-center">
            <p className="font-display text-ink text-xl">New combo offers are coming soon</p>
            <p className="text-muted mt-2 text-sm">Meanwhile, check out our latest deals.</p>
            <Link
              href="/products?onSale=1"
              className="bg-noir mt-5 inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
            >
              View hot deals
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
