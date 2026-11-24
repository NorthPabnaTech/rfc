import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { discountPercent, Price } from '@/features/products/price';
import { RatingStars } from '@/features/products/rating-stars';
import { listProductReviews } from '@/services/engagement';
import { getProductBySlug } from '@/services/products';
import { getSettings } from '@/services/settings';
import { listAddresses } from '@/services/users';
import { IconText } from '@components/common/icon-text';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { getCurrentUser } from '@lib/auth/current-user';
import { formatStoreDate } from '@lib/utils';

import { ProductGallery } from '../../products/[slug]/components/product-gallery';
import { ProductInfoTabs } from '../../products/[slug]/components/product-info-tabs';
import { ExpressOrderForm } from './components/express-order-form';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: 'Product not found' };
  const title = p.seo.metaTitle || `Order ${p.name}`;
  const description =
    p.seo.metaDescription ||
    p.shortDescription ||
    `Order ${p.name} directly with Cash on Delivery across Bangladesh.`;
  const image = p.images[0]?.url;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
      type: 'website',
    },
  };
}

export default async function SingleProductOrderPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const user = await getCurrentUser();
  const [settings, addresses, { reviews }] = await Promise.all([
    getSettings(),
    user ? listAddresses(user.id) : [],
    listProductReviews(product.id),
  ]);
  const off = discountPercent(product.price, product.salePrice);
  const whatsappNumber = (settings.social.whatsapp || settings.supportPhone).replace(/[^\d]/g, '');
  const whatsappUrl =
    settings.whatsappEnabled && settings.whatsappProductEnabled && whatsappNumber
      ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi, I want to order: ${product.name}`)}`
      : null;

  return (
    <div className="container-page py-8 sm:py-10">
      {/* Hero: Product Details */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12">
        <ProductGallery images={product.images} name={product.name} />

        <div className="flex flex-col justify-center">
          {product.category && (
            <Link
              href={`/products?category=${(product.subCategory ?? product.category).slug}`}
              className="text-accent text-[11px] font-bold tracking-[0.2em] uppercase hover:underline"
            >
              {(product.subCategory ?? product.category).name}
            </Link>
          )}
          <h1 className="font-display text-ink mt-2 text-xl leading-snug font-bold sm:text-2xl lg:text-3xl">
            {product.name}
          </h1>

          {(product.ratingCount > 0 || product.soldCount > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              {product.ratingCount > 0 && (
                <a href="#details" className="flex items-center gap-2">
                  <RatingStars value={product.ratingAverage} />
                  <span className="text-muted">
                    {product.ratingAverage.toFixed(1)} · {product.ratingCount} reviews
                  </span>
                </a>
              )}
              {product.soldCount > 0 && (
                <span className="text-muted">
                  {product.ratingCount > 0 ? '· ' : ''}
                  {product.soldCount}+ sold
                </span>
              )}
            </div>
          )}

          <div className="border-line mt-5 flex items-center gap-3 border-y py-4">
            <Price price={product.price} salePrice={product.salePrice} size="lg" />
            {off > 0 && (
              <span className="bg-brand-soft text-brand-ink rounded-full px-3 py-1 text-xs font-bold">
                Save {off}%
              </span>
            )}
          </div>

          {product.shortDescription && (
            <p className="text-base-600 mt-4 leading-relaxed">{product.shortDescription}</p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="primary" size="xl" asChild className="flex-1 sm:flex-initial">
              <a href="#order-form">
                <Icon name="bag" size={18} />
                Order Now
              </a>
            </Button>
            {whatsappUrl && (
              <Button variant="outline" size="xl" asChild>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <Icon name="whatsapp" size={18} className="text-[#25D366]" />
                  WhatsApp
                </a>
              </Button>
            )}
          </div>

          <div className="bg-cream mt-6 grid gap-3 rounded-2xl p-4 text-sm sm:grid-cols-2">
            <IconText icon="shipping" iconClassName="text-accent" className="text-ink">
              Fast delivery across Bangladesh
            </IconText>
            <IconText icon="money" iconClassName="text-accent" className="text-ink">
              Cash on Delivery available
            </IconText>
            <IconText icon="badgeCheck" iconClassName="text-accent" className="text-ink">
              100% quality checked
            </IconText>
            <a href={`tel:${settings.supportPhone}`} className="text-ink hover:underline">
              <IconText icon="phone" iconClassName="text-accent">
                Call: {settings.supportPhone}
              </IconText>
            </a>
          </div>
        </div>
      </div>

      {/* Express Single-Page Order Form */}
      <section id="order-form" className="mt-12 scroll-mt-20">
        <ExpressOrderForm
          product={product}
          user={user && { name: user.name, email: user.email, phone: user.phone }}
          addresses={addresses}
          fees={{
            inside_dhaka: settings.shippingFeeInsideDhaka,
            outside_dhaka: settings.shippingFeeOutsideDhaka,
          }}
        />
      </section>

      {/* Product Description, Specifications & Reviews */}
      <section id="details" className="mt-16 scroll-mt-20">
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
                <p className="text-muted text-sm">No description provided.</p>
              ),
            },
            {
              id: 'specs',
              label: 'Specifications',
              content: product.specifications.length ? (
                <dl className="divide-line border-line max-w-2xl divide-y rounded-2xl border">
                  {product.specifications.map((s) => (
                    <div
                      key={s.label}
                      className="grid grid-cols-[160px_minmax(0,1fr)] gap-4 px-4 py-3 text-sm"
                    >
                      <dt className="text-muted font-medium">{s.label}</dt>
                      <dd className="text-ink">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-muted text-sm">No specifications listed.</p>
              ),
            },
            {
              id: 'reviews',
              label: `Reviews (${reviews.length})`,
              content: reviews.length ? (
                <ul className="space-y-4">
                  {reviews.slice(0, 10).map((r) => (
                    <li key={r.id} className="border-line rounded-2xl border bg-white p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-ink text-sm font-semibold">{r.userName}</span>
                        <span className="text-subtle text-xs">{formatStoreDate(r.createdAt)}</span>
                      </div>
                      <RatingStars value={r.rating} className="mt-1" />
                      {r.comment && <p className="text-base-600 mt-2 text-sm">{r.comment}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted text-sm">No customer reviews yet.</p>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}
