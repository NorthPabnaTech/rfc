import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { discountPercent, Price, Taka } from '@/features/products/price';
import { ProductGrid } from '@/features/products/product-card';
import { ProductImage } from '@/features/products/product-image';
import { RatingStars } from '@/features/products/rating-stars';
import {
  getReviewEligibility,
  listProductQuestions,
  listProductReviews,
} from '@/services/engagement';
import { getProductBySlug, getRelatedProducts } from '@/services/products';
import { getSettings } from '@/services/settings';
import type { ProductDetailDTO } from '@/types';
import { Icon } from '@components/icon/icon';
import { SITE } from '@config/site';
import { getCurrentUser } from '@lib/auth/current-user';
import { formatStoreDate } from '@lib/utils';

import { SectionHeading } from '../../components/home/section-heading';
import { AskQuestionForm } from './components/ask-question-form';
import { ProductGallery } from './components/product-gallery';
import { ProductInfoTabs } from './components/product-info-tabs';
import { PurchasePanel } from './components/purchase-panel';
import { ReviewForm } from './components/review-form';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: 'Product not found' };
  const title = p.seo.metaTitle || p.name;
  const description =
    p.seo.metaDescription || p.shortDescription || `Buy ${p.name} at RFC Gadget with Cash on Delivery.`;
  const image = p.images[0]?.url;
  return {
    title,
    description,
    keywords: p.seo.keywords,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
      type: 'website',
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const user = await getCurrentUser();
  const [settings, related, { reviews, counts }, questions, eligibility] = await Promise.all([
    getSettings(),
    getRelatedProducts(product),
    listProductReviews(product.id),
    listProductQuestions(product.id, user?.id),
    getReviewEligibility(user?.id ?? null, product.id),
  ]);
  const off = discountPercent(product.price, product.salePrice);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images.map((i) => i.url),
    description: product.seo.metaDescription || product.shortDescription,
    sku: product.sku,
    category: product.category?.name,
    brand: { '@type': 'Brand', name: SITE.name },
    offers: {
      '@type': 'Offer',
      url: `${SITE.url}/products/${product.slug}`,
      priceCurrency: 'BDT',
      price: product.effectivePrice,
      availability:
        product.stockStatus === 'out_of_stock'
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
    },
    ...(product.ratingCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.ratingAverage,
            reviewCount: product.ratingCount,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify output with "<" escaped cannot break out of the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <div className="container-page py-8">
        <nav
          aria-label="Breadcrumb"
          className="text-muted mb-6 flex flex-wrap items-center gap-1.5 text-xs"
        >
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <Icon name="chevRight" size={11} />
          {product.category && (
            <>
              <Link href={`/products?category=${product.category.slug}`} className="hover:text-ink">
                {product.category.name}
              </Link>
              <Icon name="chevRight" size={11} />
            </>
          )}
          <span className="text-ink line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
          <ProductGallery images={product.images} name={product.name} />

          <div className="lg:pt-2">
            {product.category && (
              <Link
                href={`/products?category=${(product.subCategory ?? product.category).slug}`}
                className="text-accent text-[11px] font-bold tracking-[0.2em] uppercase hover:underline"
              >
                {(product.subCategory ?? product.category).name}
              </Link>
            )}
            <h1 className="type-display text-ink mt-2">{product.name}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              {product.ratingCount > 0 ? (
                <a href="#reviews" className="flex items-center gap-2">
                  <RatingStars value={product.ratingAverage} />
                  <span className="text-muted">
                    {product.ratingAverage.toFixed(1)} · {product.ratingCount} reviews
                  </span>
                </a>
              ) : (
                <span className="text-muted">No reviews yet</span>
              )}
              {product.soldCount > 0 && (
                <span className="text-muted">· {product.soldCount}+ sold</span>
              )}
            </div>

            <div className="border-line mt-6 flex items-center gap-3 border-y py-5">
              <Price price={product.price} salePrice={product.salePrice} size="lg" />
              {off > 0 && (
                <span className="bg-brand-soft text-brand-ink rounded-full px-3 py-1 text-xs font-bold">
                  Save {off}%
                </span>
              )}
            </div>

            {product.shortDescription && (
              <p className="text-base-600 mt-5 leading-relaxed">{product.shortDescription}</p>
            )}

            {product.isCombo && product.comboItems.length > 0 && (
              <ComboContents product={product} />
            )}

            <div className="mt-7">
              <PurchasePanel product={product} supportPhone={settings.supportPhone} />
            </div>

            {product.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {product.tags.map((t) => (
                  <Link
                    key={t.id}
                    href={`/products?tags=${t.slug}`}
                    className="bg-well text-muted hover:text-ink rounded-full px-3 py-1 text-xs"
                  >
                    #{t.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <section className="mt-20" id="reviews">
          <ProductInfoTabs
            tabs={[
              {
                id: 'description',
                label: 'Description',
                content: product.description ? (
                  <div
                    className="prose-store max-w-3xl"
                    dangerouslySetInnerHTML={{ __html: product.description }}
                  />
                ) : (
                  <p className="text-muted">
                    {product.shortDescription || 'No description available.'}
                  </p>
                ),
              },
              ...(product.specifications.length
                ? [
                    {
                      id: 'specifications',
                      label: 'Specifications',
                      content: (
                        <dl className="divide-line border-line max-w-3xl divide-y overflow-hidden rounded-2xl border">
                          {product.specifications.map((s) => (
                            <div
                              key={s.label}
                              className="grid grid-cols-[minmax(120px,1fr)_2fr] text-sm"
                            >
                              <dt className="bg-surface text-muted px-5 py-3.5 font-medium">
                                {s.label}
                              </dt>
                              <dd className="text-ink px-5 py-3.5">{s.value}</dd>
                            </div>
                          ))}
                        </dl>
                      ),
                    },
                  ]
                : []),
              {
                id: 'reviews',
                label: `Reviews (${product.ratingCount})`,
                content: (
                  <div className="grid grid-cols-1 gap-10 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <div>
                      <p className="font-display text-ink text-5xl">
                        {product.ratingAverage.toFixed(1)}
                      </p>
                      <RatingStars value={product.ratingAverage} size={18} className="mt-2" />
                      <p className="text-muted mt-1 text-sm">
                        Based on {product.ratingCount} reviews
                      </p>
                      <div className="mt-5 space-y-1.5">
                        {[5, 4, 3, 2, 1].map((n) => {
                          const pct = product.ratingCount
                            ? ((counts[n] ?? 0) / product.ratingCount) * 100
                            : 0;
                          return (
                            <div key={n} className="flex items-center gap-2 text-xs">
                              <span className="text-muted w-3">{n}</span>
                              <span className="bg-well h-2 flex-1 overflow-hidden rounded-full">
                                <span
                                  className="bg-brand-400 block h-full rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </span>
                              <span className="text-subtle w-6 text-right">{counts[n] ?? 0}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-6">
                        {eligibility.canReview ? (
                          <ReviewForm productId={product.id} slug={product.slug} />
                        ) : eligibility.reason === 'signin' ? (
                          <p className="text-muted text-sm">
                            <Link
                              href={`/login?next=/products/${product.slug}%23reviews`}
                              className="text-ink font-semibold underline"
                            >
                              Sign in
                            </Link>{' '}
                            to review products you’ve purchased.
                          </p>
                        ) : eligibility.reason === 'reviewed' ? (
                          <p className="text-muted text-sm">
                            You’ve reviewed this product. Thank you!
                          </p>
                        ) : (
                          <p className="text-muted text-sm">
                            Only customers who received this product can review it.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-6">
                      {reviews.length === 0 && (
                        <p className="text-muted">Be the first to share your thoughts.</p>
                      )}
                      {reviews.map((r) => (
                        <article key={r.id} className="border-line border-b pb-6 last:border-0">
                          <div className="flex items-center gap-3">
                            <span className="bg-brand-gradient text-brand-contrast grid size-10 place-items-center rounded-full font-bold">
                              {r.userName.charAt(0)}
                            </span>
                            <div>
                              <p className="text-ink text-sm font-semibold">{r.userName}</p>
                              <p className="text-subtle text-xs">
                                {formatStoreDate(r.createdAt)} ·{' '}
                                <span className="text-[var(--status-ok-fg)]">
                                  Verified purchase
                                </span>
                              </p>
                            </div>
                            <RatingStars value={r.rating} className="ml-auto" />
                          </div>
                          <p className="text-base-700 mt-3 text-[15px] leading-relaxed">
                            {r.comment}
                          </p>
                          {r.images.length > 0 && (
                            <div className="mt-3 flex gap-2">
                              {r.images.map((img) => (
                                <a
                                  key={img.url}
                                  href={img.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-well relative size-20 overflow-hidden rounded-xl"
                                >
                                  <ProductImage
                                    src={img.url}
                                    alt="Review photo"
                                    fill
                                    sizes="80px"
                                  />
                                </a>
                              ))}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                id: 'questions',
                label: `Q&A (${questions.filter((q) => q.answer).length})`,
                content: (
                  <div className="grid max-w-3xl gap-8">
                    {user ? (
                      <AskQuestionForm productId={product.id} slug={product.slug} />
                    ) : (
                      <p className="text-muted text-sm">
                        <Link
                          href={`/login?next=/products/${product.slug}`}
                          className="text-ink font-semibold underline"
                        >
                          Sign in
                        </Link>{' '}
                        to ask a question about this product.
                      </p>
                    )}
                    {questions.length === 0 && <p className="text-muted">No questions yet.</p>}
                    <ul className="space-y-5">
                      {questions.map((q) => (
                        <li key={q.id} className="bg-surface rounded-2xl p-5">
                          <p className="text-ink flex gap-2.5 font-semibold">
                            <span className="text-accent">Q.</span> {q.question}
                          </p>
                          <p className="text-subtle mt-1 pl-6 text-xs">
                            {q.userName} · {formatStoreDate(q.createdAt)}
                          </p>
                          {q.answer ? (
                            <p className="text-base-700 mt-3 flex gap-2.5">
                              <span className="font-semibold text-[var(--status-ok-fg)]">A.</span>{' '}
                              {q.answer}
                            </p>
                          ) : (
                            <p className="text-muted mt-3 pl-6 text-sm italic">
                              Awaiting an answer from RFC Gadget
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
              },
            ]}
          />
        </section>

        {related.length > 0 && (
          <section className="mt-16">
            <SectionHeading
              title="You may also like"
              icon="sparkles"
              href={product.category ? `/products?category=${product.category.slug}` : '/products'}
            />
            <ProductGrid products={related.slice(0, 5)} priorityCount={0} />
          </section>
        )}
      </div>
    </>
  );
}

/** "What's in this combo" — the bundle's items and what you save. */
function ComboContents({ product }: { product: ProductDetailDTO }) {
  const separately = product.comboItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const save = separately - product.effectivePrice;
  return (
    <div className="border-line mt-6 rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-ink text-sm font-semibold">What’s in this combo</p>
        {save > 0 && (
          <span className="rounded-md bg-[var(--status-ok-bg)] px-2 py-1 text-[12px] font-bold text-[var(--status-ok-fg)]">
            You save <Taka amount={save} />
          </span>
        )}
      </div>
      <ul className="divide-line mt-3 divide-y">
        {product.comboItems.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-2.5">
            <span className="bg-cream relative size-12 shrink-0 overflow-hidden rounded-lg">
              <ProductImage src={item.image?.url} alt="" fill sizes="48px" />
            </span>
            <Link
              href={`/products/${item.slug}`}
              className="text-ink hover:text-accent min-w-0 flex-1 text-[13px] font-medium"
            >
              <span className="line-clamp-1">{item.name}</span>
            </Link>
            <span className="text-muted shrink-0 text-[12.5px]">
              {item.quantity} × <Taka amount={item.price} />
            </span>
          </li>
        ))}
      </ul>
      <p className="text-muted mt-2 text-[12.5px]">
        Bought separately: <Taka amount={separately} className="line-through" />
      </p>
    </div>
  );
}
