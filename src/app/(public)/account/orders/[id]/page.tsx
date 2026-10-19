import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  OrderItemsList,
  OrderProgress,
  OrderStatusBadge,
  OrderTotals,
  ReturnStatusBadge,
  ShippingAddressBlock,
} from '@/features/orders/order-ui';
import { getCustomerOrder } from '@/services/orders';
import { Icon } from '@components/icon/icon';
import { requireUserPage } from '@lib/auth/current-user';
import { PAYMENT_METHOD_LABELS } from '@lib/constants';
import { formatStoreDate, formatStoreDateTime } from '@lib/utils';
import { objectId } from '@lib/validators/common';

import { CancelOrderButton } from './components/cancel-order-button';
import { ReturnRequestDialog } from './components/return-request-dialog';

export const metadata: Metadata = { title: 'Order details' };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage(`/account/orders/${id}`);
  if (!objectId.safeParse(id).success) notFound();
  const order = await getCustomerOrder(user.id, id);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/account/orders"
        className="text-muted hover:text-ink inline-flex items-center gap-1.5 text-sm"
      >
        <Icon name="arrowLeft" size={14} /> All orders
      </Link>

      <section className="border-line rounded-3xl border bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-ink text-2xl">{order.orderNumber}</h2>
            <p className="text-muted text-sm">Placed {formatStoreDateTime(order.createdAt)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            {order.canCancel && <CancelOrderButton orderId={order.id} />}
            {order.canRequestReturn && <ReturnRequestDialog orderId={order.id} />}
          </div>
        </div>
        <div className="mt-8">
          <OrderProgress order={order} />
        </div>
        {order.status === 'pending' && (
          <p className="text-muted mt-6 text-sm">
            You can cancel this order until we confirm it. After confirmation, cancellation is no
            longer possible.
          </p>
        )}
        {order.canRequestReturn && (
          <p className="text-muted mt-6 text-sm">
            Something not right with your order? Read our{' '}
            <Link
              href="/return-policy"
              className="text-ink font-semibold underline underline-offset-2"
            >
              return policy
            </Link>
            .
          </p>
        )}
      </section>

      {order.returnRequest && (
        <section className="border-line rounded-3xl border bg-white p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-ink font-semibold">Return request</h3>
            <ReturnStatusBadge status={order.returnRequest.status} />
          </div>
          <p className="text-muted mt-2 text-sm">
            {order.returnRequest.reason} · requested{' '}
            {formatStoreDate(order.returnRequest.createdAt)}
          </p>
          {order.returnRequest.adminNote && (
            <p className="bg-cream text-ink mt-4 rounded-2xl px-4 py-3 text-sm">
              <span className="font-semibold">RFC Gadget:</span> {order.returnRequest.adminNote}
            </p>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="border-line rounded-3xl border bg-white p-6 sm:p-8">
          <h3 className="text-ink font-semibold">Items</h3>
          <OrderItemsList order={order} />
          {(order.status === 'delivered' || order.status === 'completed') && (
            <p className="bg-cream text-ink mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm">
              <Icon name="star" size={16} className="text-accent" />
              Enjoying your purchase? Open a product and leave a review in its Reviews tab.
            </p>
          )}
        </section>
        <div className="space-y-6">
          <section className="border-line rounded-3xl border bg-white p-6">
            <h3 className="text-ink mb-4 font-semibold">Summary</h3>
            <OrderTotals order={order} />
            <p className="text-muted mt-4 text-xs">
              Payment: {PAYMENT_METHOD_LABELS[order.paymentMethod]}
            </p>
          </section>
          <section className="border-line rounded-3xl border bg-white p-6">
            <h3 className="text-ink mb-3 font-semibold">Delivery address</h3>
            <ShippingAddressBlock order={order} />
            {order.customerNote && (
              <p className="text-muted mt-3 text-sm">Note: {order.customerNote}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
