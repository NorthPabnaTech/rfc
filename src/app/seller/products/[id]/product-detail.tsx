'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';

import { useI18n } from '@/i18n/provider';
import { Panel } from '@components/dashboard/panel';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { NotFoundState } from '@components/platform/not-found-state';
import { ProductGallery } from '@components/platform/product-gallery';
import { ProductImage } from '@components/platform/product-image';
import { StatusPill } from '@components/platform/status-pill';
import { Callout, PageHeader } from '@components/shared';
import { CurrencyInput } from '@components/shared/numeric-format-input';
import { Button } from '@components/ui/button';
import { checkSellingPrice, profitPercent, sellerProfit } from '@lib/business/pricing';
import { cn } from '@lib/utils';

import { useSellerCatalog, useSellerProduct } from '../../components/use-seller-data';

export function SellerProductDetail({ id }: { id: string }) {
  const { t, locale, money, percent } = useI18n();
  const router = useRouter();
  const { product, loading } = useSellerProduct(id);
  const { products } = useSellerCatalog();
  const [sellingInput, setSellingInput] = React.useState<number | undefined>(undefined);
  const selling = sellingInput ?? (product ? product.suggestedPrice || product.basePrice : undefined);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-10 w-64" />
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  if (!product) {
    return <NotFoundState title={t('seller.product.notFound')} backHref="/seller/products" />;
  }

  const check = checkSellingPrice(selling, product.basePrice);
  const profit = selling ? sellerProfit(selling, product.basePrice) : 0;
  const out = product.availability === 'out_of_stock';
  const related = products
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="space-y-5">
      <PageHeader
        title={locale === 'bn' ? product.nameBn : product.name}
        description={product.categoryName}
        backHref="/seller/products"
        backLabel={t('seller.catalog.title')}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-5">
          <Panel>
            <div className="space-y-6 pt-5">
              <ProductGallery images={product.images} alt={product.name} />

              <div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill kind="availability" value={product.availability} />
                  {product.categoryName && (
                    <span className="bg-well text-muted rounded-full px-2.5 py-1 text-[11.5px] font-semibold">
                      {product.categoryName}
                    </span>
                  )}
                </div>
                <h2 className="text-ink mt-3 text-xl font-bold">
                  {locale === 'bn' ? product.nameBn : product.name}
                </h2>
                {product.shortDescription && (
                  <p className="type-body text-muted mt-2.5">{product.shortDescription}</p>
                )}
              </div>

              {product.description && (
                <div
                  className="text-muted prose prose-sm border-line max-w-none border-t pt-5 text-sm"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              )}

              <div className="border-line border-t pt-5">
                <h3 className="type-card-title text-ink">{t('seller.product.info')}</h3>
                <dl className="divide-line mt-2 divide-y text-[13px]">
                  <div className="flex justify-between py-2.5">
                    <dt className="text-muted">{t('seller.product.sku')}</dt>
                    <dd className="font-mono text-xs">{product.sku || product.id}</dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-muted">{t('seller.catalog.suggested')}</dt>
                    <dd>
                      <Money value={product.suggestedPrice} className="font-semibold" />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-muted">{t('seller.product.deliveryCharge')}</dt>
                    <dd className="text-right">
                      <span className="num block font-semibold">
                        {money(product.deliveryCharges.insideDhaka)} –{' '}
                        {money(product.deliveryCharges.outsideDhaka)}
                      </span>
                      <span className="text-subtle block text-[11px]">
                        Inside Dhaka: {money(product.deliveryCharges.insideDhaka)} · Outside:{' '}
                        {money(product.deliveryCharges.outsideDhaka)}
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-muted">{t('seller.product.packagingCharge')}</dt>
                    <dd>
                      <Money value={product.packagingCharge} className="font-semibold" />
                    </dd>
                  </div>
                </dl>

                {product.variations && product.variations.length > 0 && (
                  <div className="mt-5 space-y-2">
                    <h4 className="type-label text-ink">Variations</h4>
                    {product.variations.map((v) => (
                      <div key={v.name} className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-muted font-semibold">{v.name}:</span>
                        {v.values.map((val) => (
                          <span key={val} className="bg-well text-ink rounded-md px-2 py-0.5">
                            {val}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {product.specifications && product.specifications.length > 0 && (
                  <div className="mt-5">
                    <h4 className="type-label text-ink mb-1">Specifications</h4>
                    <dl className="divide-line divide-y text-xs">
                      {product.specifications.map((s) => (
                        <div key={s.label} className="flex justify-between py-2">
                          <dt className="text-muted">{s.label}</dt>
                          <dd className="text-ink font-medium">{s.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            </div>
          </Panel>

          {related.length > 0 && (
            <Panel title={t('seller.product.related')}>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {related.map((p) => (
                  <Link
                    key={p.id}
                    href={`/seller/products/${p.slug || p.id}`}
                    className="group"
                  >
                    <ProductImage
                      src={p.images[0]}
                      alt={p.name}
                      className="aspect-square w-full"
                      iconSize={34}
                    />
                    <p className="text-ink group-hover:text-accent mt-2 line-clamp-2 text-[12.5px] font-semibold">
                      {locale === 'bn' ? p.nameBn : p.name}
                    </p>
                    <Money value={p.basePrice} className="text-muted text-xs font-semibold" />
                  </Link>
                ))}
              </div>
            </Panel>
          )}
        </div>

        <div id="price" className="scroll-mt-24 space-y-5 lg:sticky lg:top-24 lg:self-start">
          <Panel title={t('seller.product.calculator')}>
            <div className="bg-well/60 flex items-center justify-between rounded-xl p-4">
              <span className="text-muted text-[13px] font-medium">
                {t('seller.product.basePrice')}
              </span>
              <Money value={product.basePrice} className="text-ink text-xl font-extrabold" />
            </div>
            <label htmlFor="selling" className="type-label text-ink mt-5 block">
              {t('seller.product.sellingPrice')}
            </label>
            <CurrencyInput
              id="selling"
              value={selling}
              onValueChange={(v: number | undefined) => setSellingInput(v ?? undefined)}
              className="mt-1.5"
              aria-invalid={check === 'below_base' || undefined}
            />

            <div
              className={cn(
                'mt-5 rounded-2xl p-4 transition-colors',
                check === 'below_base'
                  ? 'bg-[var(--status-danger-bg)]'
                  : check === 'ok'
                    ? 'bg-[var(--status-ok-bg)]'
                    : 'bg-well/60',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-ink text-[13px] font-semibold">
                  {t('seller.product.expectedProfit')}
                </span>
                <span className="text-subtle text-[11px]">{t('seller.product.perUnit')}</span>
              </div>
              <Money
                value={profit}
                signed
                className={cn(
                  'mt-1 block text-3xl font-extrabold',
                  check === 'below_base'
                    ? 'text-[var(--status-danger-fg)]'
                    : check === 'ok'
                      ? 'text-[var(--status-ok-fg)]'
                      : 'text-ink',
                )}
              />
              {check === 'ok' && selling && (
                <p className="num mt-1 text-xs text-[var(--status-ok-fg)]">
                  {t('seller.product.margin', {
                    percent: percent(profitPercent(selling, product.basePrice)),
                  })}
                </p>
              )}
            </div>
            {check === 'below_base' && (
              <Callout
                tone="danger"
                compact
                className="mt-3"
                description={t('seller.product.belowBase', {
                  amount: money(product.basePrice - (selling ?? 0)),
                })}
              />
            )}
            {check === 'equal_base' && (
              <Callout
                tone="warn"
                compact
                className="mt-3"
                description={t('seller.product.equalBase')}
              />
            )}
            {out && (
              <Callout
                tone="danger"
                compact
                className="mt-3"
                description={t('seller.order.outOfStock')}
              />
            )}

            <Button
              size="lg"
              className="bg-highlight text-highlight-contrast hover:bg-highlight-hover mt-5 w-full font-bold"
              disabled={out || check === 'below_base' || check === 'empty'}
              onClick={() =>
                router.push(`/seller/orders/new?product=${product.id}&price=${selling ?? ''}`)
              }
            >
              <Icon name="cart" size={17} />
              {t('seller.product.orderWithPrice')}
            </Button>
            <p className="text-subtle mt-3 flex gap-1.5 text-[11.5px]">
              <Icon name="info" size={14} className="mt-px shrink-0" />
              {t('seller.product.chargesNote')}
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
