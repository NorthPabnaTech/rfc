import type { Metadata } from 'next';

import { trackOrder } from '@/services/orders';
import type { OrderDTO } from '@/types';
import { param, type SearchParams } from '@lib/search-params';
import { trackOrderSchema } from '@lib/validators/order';

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
  const initialOrderNumber = (param(sp, 'orderNumber') ?? param(sp, 'order') ?? '').trim();
  const initialPhone = (param(sp, 'phone') ?? '').trim();

  let initialOrder: OrderDTO | null = null;
  let initialError: string | null = null;

  if (initialOrderNumber && initialPhone) {
    const parsed = trackOrderSchema.safeParse({
      orderNumber: initialOrderNumber,
      phone: initialPhone,
    });
    if (!parsed.success) {
      initialError = parsed.error.issues[0]?.message ?? 'Invalid tracking link parameters.';
    } else {
      initialOrder = await trackOrder(parsed.data.orderNumber, parsed.data.phone);
      if (!initialOrder) {
        initialError = 'No order found with that number and phone.';
      }
    }
  }

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
      <TrackOrderForm
        initialOrderNumber={initialOrderNumber}
        initialPhone={initialPhone}
        initialOrder={initialOrder}
        initialError={initialError}
      />
    </div>
  );
}
