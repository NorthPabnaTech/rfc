'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { useI18n } from '@/i18n/provider';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { NotFoundState } from '@components/platform/not-found-state';
import { ProductGallery } from '@components/platform/product-gallery';
import { StatusPill } from '@components/platform/status-pill';
import { Button } from '@components/ui/button';
import { resellerApi, type ResellerProduct } from '@lib/api/reseller';

export default function PublicProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();
  const [product, setProduct] = React.useState<ResellerProduct | null>(null);
  const [authenticated, setAuthenticated] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    resellerApi
      .getProduct(slug)
      .then((res) => {
        if (!active) return;
        setAuthenticated(res.authenticated);
        setProduct(res.data);
      })
      .catch(() => {
        if (active) setProduct(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="container-page py-12">
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-page py-12">
        <NotFoundState title={t('seller.product.notFound')} backHref="/products" />
      </div>
    );
  }

  const images = (product.images ?? []).map((i) => i.url).filter(Boolean);
  const availability =
    product.stockStatus === 'out_of_stock'
      ? 'out_of_stock'
      : product.stockStatus === 'limited'
        ? 'limited'
        : 'in_stock';

  return (
    <div className="container-page py-10 sm:py-14">
      <Link
        href="/products"
        className="text-muted hover:text-ink mb-6 inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <Icon name="chevLeft" size={16} />
        {t('site.products')}
      </Link>

      <div className="bg-panel border-line grid gap-8 rounded-2xl border p-6 md:grid-cols-2 lg:p-8">
        <ProductGallery images={images} alt={product.name} />
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill kind="availability" value={availability} />
            {product.category && (
              <span className="bg-well text-muted rounded-full px-3 py-1 text-xs font-semibold">
                {product.category.name}
              </span>
            )}
            {product.sku && (
              <span className="text-subtle font-mono text-xs">SKU: {product.sku}</span>
            )}
          </div>

          <h1 className="type-page-title text-ink mt-4">{product.name}</h1>

          {product.shortDescription && (
            <p className="text-muted mt-3 text-sm leading-relaxed">{product.shortDescription}</p>
          )}

          {authenticated && typeof product.resellerPrice === 'number' ? (
            <div className="bg-well/60 border-line mt-6 space-y-3 rounded-2xl border p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-muted text-sm">{t('seller.catalog.basePrice')}</span>
                <Money value={product.resellerPrice} className="text-ink text-2xl font-extrabold" />
              </div>
              {typeof product.suggestedRetailPrice === 'number' && (
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted">{t('seller.catalog.suggested')}</span>
                  <Money value={product.suggestedRetailPrice} className="text-ink font-semibold" />
                </div>
              )}
              {typeof product.packagingCost === 'number' && (
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted">{t('seller.product.packagingCharge')}</span>
                  <Money value={product.packagingCost} className="font-semibold" />
                </div>
              )}
              {product.deliveryCharges && (
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted">{t('seller.product.deliveryCharge')}</span>
                  <span className="num font-semibold">
                    ৳{product.deliveryCharges.insideDhaka} – ৳{product.deliveryCharges.outsideDhaka}
                  </span>
                </div>
              )}
              <Button variant="primary" size="lg" asChild className="mt-2 w-full">
                <Link href={`/seller/products/${product.slug}`}>
                  <Icon name="cart" size={17} />
                  {t('seller.product.orderWithPrice')}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="border-brand-200 bg-brand-soft/40 mt-6 rounded-2xl border border-dashed p-5">
              <div className="flex items-center gap-2.5">
                <span className="bg-highlight-soft grid size-10 place-items-center rounded-xl text-[var(--color-sun-600)]">
                  <Icon name="lock" size={20} />
                </span>
                <div>
                  <p className="text-ink text-sm font-bold">{t('site.showcase.priceLocked')}</p>
                  <p className="text-muted text-xs">{t('site.showcase.subtitle')}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="primary" asChild>
                  <Link href="/login">{t('auth.signIn')}</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/register">{t('site.becomeSeller')}</Link>
                </Button>
              </div>
            </div>
          )}

          {product.variations && product.variations.length > 0 && (
            <div className="mt-6 space-y-2">
              <h2 className="type-label text-ink">Variations</h2>
              {product.variations.map((v) => (
                <div key={v.name} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted font-semibold">{v.name}:</span>
                  {v.values.map((val) => (
                    <span key={val} className="bg-well text-ink rounded-md px-2 py-1">
                      {val}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}

          {product.specifications && product.specifications.length > 0 && (
            <div className="mt-6">
              <h2 className="type-label text-ink mb-2">Specifications</h2>
              <dl className="divide-line divide-y border-t text-xs">
                {product.specifications.map((s) => (
                  <div key={s.label} className="flex justify-between py-2">
                    <dt className="text-muted">{s.label}</dt>
                    <dd className="text-ink font-medium">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {product.description && (
            <div className="mt-6 border-t pt-5">
              <h2 className="type-label text-ink mb-2">{t('seller.product.info')}</h2>
              <div
                className="text-muted prose prose-sm max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
