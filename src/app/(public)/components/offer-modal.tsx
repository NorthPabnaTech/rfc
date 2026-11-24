'use client';

import * as React from 'react';
import Link from 'next/link';

import type { CampaignDTO } from '@/types';
import { CountdownTimer } from '@components/common/countdown-timer';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@components/ui/dialog';
import { formatNumber } from '@lib/utils';

export function OfferModal({ campaign }: { campaign: CampaignDTO | null }) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!campaign || !campaign.showModal) return;
    const key = `rfc_offer_seen_${campaign.id}`;
    try {
      if (window.localStorage.getItem(key)) return;
    } catch {
      return;
    }
    const timer = window.setTimeout(() => {
      setOpen(true);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [campaign]);

  if (!campaign) return null;

  const markSeen = () => {
    try {
      window.localStorage.setItem(`rfc_offer_seen_${campaign.id}`, '1');
    } catch {
      // ignore storage errors
    }
    setOpen(false);
  };

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
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && markSeen()}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <div className="bg-noir relative px-6 pt-7 pb-6 text-center text-white">
          <div
            aria-hidden="true"
            className="bg-brand/25 pointer-events-none absolute -top-12 left-1/2 size-44 -translate-x-1/2 rounded-full blur-2xl"
          />
          <span className="bg-brand text-brand-contrast relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
            <Icon name="coupon" size={13} />
            {campaign.type === 'coupon' ? 'Exclusive Coupon' : 'Special Offer'}
          </span>
          <p className="font-display relative mt-3 text-4xl font-bold tracking-tight text-white">
            {discountLabel}
          </p>
          <DialogTitle className="relative mt-1.5 text-lg font-semibold text-white">
            {campaign.title}
          </DialogTitle>
        </div>

        <div className="space-y-4 p-6 text-center">
          {campaign.description && (
            <p className="text-muted text-sm leading-relaxed">{campaign.description}</p>
          )}

          <div className="space-y-1.5">
            <p className="text-subtle text-[11px] font-semibold uppercase tracking-wider">
              Offer ends in
            </p>
            <CountdownTimer endsAt={campaign.endsAt} tone="light" />
          </div>

          {campaign.type === 'coupon' && campaign.couponCode && (
            <div className="bg-cream border-line flex items-center justify-between gap-2 rounded-xl border border-dashed px-4 py-2.5">
              <div className="text-left">
                <p className="text-subtle text-[10px] font-semibold uppercase tracking-wider">
                  Use code at checkout
                </p>
                <p className="text-ink font-mono text-base font-bold tracking-wider">
                  {campaign.couponCode}
                </p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={copyCode}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            <Button variant="primary" size="lg" asChild onClick={markSeen}>
              <Link href={ctaHref}>Shop the offer</Link>
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={markSeen}>
              Maybe later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
