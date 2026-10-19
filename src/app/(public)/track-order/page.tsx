import type { Metadata } from 'next';

import { param, type SearchParams } from '@lib/search-params';

import { TrackOrderForm } from './components/track-order-form';

export const metadata: Metadata = {
  title: 'Track your order',
  description: 'Check the delivery status of your RFC Gadget order.',
};

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  return (
    <div className="container-page max-w-3xl py-14">
      <div className="text-center">
        <p className="text-accent text-[11px] font-bold tracking-[0.22em] uppercase">
          Order tracking
        </p>
        <h1 className="type-display text-ink mt-2">Where’s my order?</h1>
        <p className="text-muted mx-auto mt-3 max-w-md">
          Enter your order number and the mobile number you used at checkout.
        </p>
      </div>
      <TrackOrderForm initialOrderNumber={param(sp, 'order') ?? ''} />
    </div>
  );
}
