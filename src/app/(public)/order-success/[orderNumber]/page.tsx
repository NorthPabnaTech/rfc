import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Taka } from '@/features/products/price';
import { getOrderConfirmation } from '@/services/orders';
import { getSettings } from '@/services/settings';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { getCurrentUser } from '@lib/auth/current-user';

export const metadata: Metadata = { title: 'Order placed', robots: { index: false } };

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const [order, settings, user] = await Promise.all([
    getOrderConfirmation(decodeURIComponent(orderNumber).toUpperCase()),
    getSettings(),
    getCurrentUser(),
  ]);
  if (!order) notFound();

  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-xl text-center">
        <span className="bg-noir text-brand-300 animate-pop mx-auto grid size-20 place-items-center rounded-full">
          <Icon name="checkCircle" size={38} />
        </span>
        <h1 className="type-display text-ink mt-6">Thank you, {order.firstName}!</h1>
        <p className="text-muted mt-3">
          Your order has been placed. We’ll call you shortly to confirm it before shipping.
        </p>

        <div className="bg-cream mt-8 grid grid-cols-3 divide-x divide-[var(--color-line)] rounded-3xl py-6">
          <div>
            <p className="text-muted text-xs tracking-wide uppercase">Order</p>
            <p className="text-ink mt-1 font-bold">{order.orderNumber}</p>
          </div>
          <div>
            <p className="text-muted text-xs tracking-wide uppercase">Items</p>
            <p className="text-ink mt-1 font-bold">{order.itemCount}</p>
          </div>
          <div>
            <p className="text-muted text-xs tracking-wide uppercase">Pay on delivery</p>
            <Taka amount={order.total} className="text-ink mt-1 block font-bold" />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="noir" size="xl" asChild>
            <Link href={user ? '/account/orders' : `/track-order?order=${order.orderNumber}`}>
              {user ? 'View my orders' : 'Track this order'}
            </Link>
          </Button>
          <Button variant="secondary" size="xl" asChild>
            <Link href="/products">Continue shopping</Link>
          </Button>
        </div>
        <p className="text-muted mt-8 text-sm">
          Questions? Call us at{' '}
          <a href={`tel:${settings.supportPhone}`} className="text-ink font-semibold">
            {settings.supportPhone}
          </a>
        </p>
      </div>
    </div>
  );
}
