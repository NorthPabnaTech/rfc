import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Taka } from '@/features/products/price';
import { getOrderConfirmation } from '@/services/orders';
import { verifyAndCompletePaymentlyOrder } from '@/services/payments';
import { getSettings } from '@/services/settings';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { getCurrentUser } from '@lib/auth/current-user';
import { hasOrderAccess } from '@lib/order-access';

import { PaymentlyVerifier } from './paymently-verifier';

export const metadata: Metadata = { title: 'Order placed', robots: { index: false } };

export default async function OrderSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ invoice_id?: string; cancelled?: string; error?: string }>;
}) {
  const [{ orderNumber }, query] = await Promise.all([params, searchParams]);
  const normalizedNumber = decodeURIComponent(orderNumber).toUpperCase();
  const [initialOrder, settings, user] = await Promise.all([
    getOrderConfirmation(normalizedNumber),
    getSettings(),
    getCurrentUser(),
  ]);
  if (!initialOrder) notFound();
  // Order numbers are sequential: only the browser that placed the order, the
  // owning account or an admin may see it (name, total, payment token).
  const canView =
    (user && (user.role === 'admin' || user.id === initialOrder.userId)) ||
    (await hasOrderAccess(initialOrder.orderNumber));
  if (!canView) notFound();
  let order = initialOrder;

  let serverVerifyError: string | undefined;
  if (query.invoice_id && order.paymentStatus !== 'paid') {
    try {
      const result = await verifyAndCompletePaymentlyOrder({
        invoiceId: query.invoice_id,
        expectedOrderNumber: order.orderNumber,
      });
      if (result.verified) {
        const refreshed = await getOrderConfirmation(normalizedNumber);
        if (refreshed) order = refreshed;
      } else {
        serverVerifyError = result.message;
      }
    } catch (err) {
      serverVerifyError =
        err instanceof Error ? err.message : 'Unable to verify payment right now.';
    }
  }

  const isOnline = order.paymentMethod === 'paymently';
  const isPaid = order.paymentStatus === 'paid';
  const isCancelled = isOnline && !isPaid && query.cancelled === '1';
  const isFailed = isOnline && !isPaid && query.error === '1';

  const heroIcon = isPaid || !isOnline
    ? 'checkCircle'
    : isCancelled
      ? 'cancelCircle'
      : isFailed
        ? 'alert'
        : 'card';

  const heroIconClass = isPaid || !isOnline
    ? 'bg-noir text-brand-300'
    : isCancelled
      ? 'bg-[var(--status-warn-bg)] text-[var(--status-warn-fg)]'
      : isFailed
        ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]'
        : 'bg-noir text-brand-300';

  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-xl text-center">
        <span
          className={`animate-pop mx-auto grid size-20 place-items-center rounded-full ${heroIconClass}`}
        >
          <Icon name={heroIcon} size={38} />
        </span>
        <h1 className="type-display text-ink mt-6">
          {isPaid
            ? `Payment confirmed, ${order.firstName}!`
            : isCancelled
              ? `Payment cancelled, ${order.firstName}`
              : isFailed
                ? `Payment failed, ${order.firstName}`
                : isOnline
                  ? `Order saved, ${order.firstName}`
                  : `Thank you, ${order.firstName}!`}
        </h1>
        <p className="text-muted mt-3">
          {isPaid
            ? `Your online payment${order.gatewayPaymentMethod ? ` (${order.gatewayPaymentMethod})` : ''} has been verified. We’ll process your order shortly.`
            : isOnline
              ? 'Complete your online payment below to confirm your order.'
              : 'Your order has been placed. We’ll call you shortly to confirm it before shipping.'}
        </p>

        {isOnline && (
          <PaymentlyVerifier
            orderId={order.id}
            orderNumber={order.orderNumber}
            paymentToken={order.paymentToken}
            paymentStatus={order.paymentStatus}
            invoiceId={order.paymentStatus === 'paid' ? undefined : query.invoice_id}
            cancelled={query.cancelled === '1'}
            gatewayError={query.error === '1' || Boolean(serverVerifyError)}
          />
        )}

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
            <p className="text-muted text-xs tracking-wide uppercase">
              {isPaid ? 'Paid online' : isOnline ? 'Amount due' : 'Pay on delivery'}
            </p>
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
