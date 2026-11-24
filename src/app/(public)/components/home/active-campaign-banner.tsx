'use client';

import * as React from 'react';
import Link from 'next/link';

import { ProductImage } from '@/features/products/product-image';
import type { CampaignDTO } from '@/types';
import { CountdownTimer } from '@components/common/countdown-timer';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { formatNumber } from '@lib/utils';

export function ActiveCampaignBanner({ campaigns }: { campaigns: CampaignDTO[] }) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const campaign = campaigns.find((c) => c.showOnHome);
  if (!campaign) return null;

  const discountLabel =
    campaign.discountType === 'free_delivery'
      ? 'FREE DELIVERY'
      : campaign.discountType === 'half_delivery'
        ? '50% OFF DELIVERY'
        : campaign.discountType === 'delivery_discount'
          ? `৳${formatNumber(campaign.discountValue)} OFF DELIVERY`
          : campaign.discountType === 'percentage'
            ? `${campaign.discountValue}% OFF`
            : `৳${formatNumber(campaign.discountValue)} OFF`;

  const ctaHref =
    campaign.scope === 'products' && campaign.products.length === 1 && campaign.products[0]
      ? `/products/${campaign.products[0].slug}`
      : '/products';

  const copyCode = async () => {
    if (!campaign.couponCode) return;
    try {
      await navigator.clipboard.writeText(campaign.couponCode);
      setCopiedId(campaign.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <section className="container-page pt-8 sm:pt-10" aria-label="Active campaign">
      <div className="bg-noir relative overflow-hidden rounded-3xl p-5 text-white shadow-sm sm:p-8">
        <div
          aria-hidden="true"
          className="bg-brand/20 pointer-events-none absolute -top-20 -right-20 size-64 rounded-full blur-3xl"
        />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-brand text-brand-contrast inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                <Icon name="coupon" size={13} />
                {campaign.type === 'coupon' ? 'Coupon Deal' : 'Limited Time Offer'}
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white">
                {discountLabel}
              </span>
              {campaign.minOrderAmount > 0 && (
                <span className="text-xs text-white/75">
                  Min order ৳{formatNumber(campaign.minOrderAmount)}
                </span>
              )}
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                {campaign.title}
              </h2>
              {campaign.description && (
                <p className="mt-1 max-w-xl text-sm text-white/80">{campaign.description}</p>
              )}
            </div>

            {campaign.scope === 'products' && campaign.products.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {campaign.products.slice(0, 4).map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.slug}`}
                    className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 p-1.5 pr-3 text-xs font-medium text-white transition hover:bg-white/20"
                  >
                    <span className="relative size-7 shrink-0 overflow-hidden rounded-lg bg-white">
                      <ProductImage src={p.image?.url} alt={p.name} fill sizes="28px" />
                    </span>
                    <span className="max-w-[140px] truncate">{p.name}</span>
                  </Link>
                ))}
                {campaign.products.length > 4 && (
                  <span className="text-xs text-white/70">
                    +{campaign.products.length - 4} more
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
            <div className="space-y-1 lg:text-right">
              <p className="text-[11px] font-medium uppercase tracking-wider text-white/70">
                Ends in
              </p>
              <CountdownTimer endsAt={campaign.endsAt} tone="dark" />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {campaign.type === 'coupon' && campaign.couponCode && (
                <button
                  type="button"
                  onClick={copyCode}
                  className="inline-flex items-center gap-2 rounded-xl border border-dashed border-white/40 bg-white/10 px-3.5 py-2 text-xs font-bold tracking-wider text-white transition hover:bg-white/20"
                >
                  <span>{campaign.couponCode}</span>
                  <span className="text-brand-300 text-[11px] font-semibold">
                    {copiedId === campaign.id ? 'Copied!' : 'Copy'}
                  </span>
                </button>
              )}
              <Button variant="primary" size="lg" asChild>
                <Link href={ctaHref}>
                  Shop offer <Icon name="chevRight" size={15} />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
