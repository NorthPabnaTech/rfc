import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductModel } from '@/database';
import {
  OrderItemsList,
  OrderProgress,
  OrderStatusBadge,
  OrderTotals,
  ReturnStatusBadge,
  ShippingAddressBlock,
} from '@/features/orders/order-ui';
import { Taka } from '@/features/products/price';
import { getBusinessBySlug } from '@/services/businesses';
import { getAdminOrder } from '@/services/orders';
import { listSupplierOrdersForOrder } from '@/services/supplier-orders';
import { Callout, PageHeader } from '@components/shared';
import { ORDER_PLATFORM_LABELS, PAYMENT_METHOD_LABELS } from '@lib/constants';
import { param, type SearchParams } from '@lib/search-params';
import { formatStoreDateTime } from '@lib/utils';
import { objectId } from '@lib/validators/common';

import { OrderActions } from './components/order-actions';
import { OrderToolbar } from './components/order-toolbar';
import {
  SupplierFulfillmentCard,
  type SupplierOrderProductMeta,
} from './components/supplier-fulfillment-card';

export const metadata: Metadata = { title: 'Order' };

export default async function AdminOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!objectId.safeParse(id).success) notFound();
  const [order, supplierOrders] = await Promise.all([
    getAdminOrder(id),
    listSupplierOrdersForOrder(id),
  ]);
  if (!order) notFound();
  const [business, productDocs] = await Promise.all([
    getBusinessBySlug(order.business),
    supplierOrders.length
      ? ProductModel.find(
          { _id: { $in: supplierOrders.map((s) => s.productId) } },
          'supplierMinSellingPrice supplierVariants',
        ).lean()
      : Promise.resolve([]),
  ]);
  const productMeta: Record<string, SupplierOrderProductMeta> = Object.fromEntries(
    productDocs.map((p) => [
      String(p._id),
      {
        supplierMinSellingPrice: p.supplierMinSellingPrice,
        supplierVariants: p.supplierVariants?.map((v) => ({
          externalVariantId: v.externalVariantId,
          color: v.color ?? null,
          size: v.size ?? null,
          stockQuantity: v.stockQuantity,
          inStock: v.inStock,
        })),
      },
    ]),
  );
  const justCreated = param(sp, 'created') === '1';

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        subtitle={`${business?.name ?? order.business} · ${order.invoiceNumber} · ${ORDER_PLATFORM_LABELS[order.platform]} order · ${formatStoreDateTime(order.createdAt)}`}
        backHref="/admin/orders"
        backLabel="Orders"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <OrderToolbar order={order} business={business} />
            <OrderStatusBadge status={order.status} />
          </div>
        }
      />

      {justCreated && (
        <Callout
          tone="success"
          className="mb-5"
          title="Order submitted successfully"
          description={`Invoice ${order.invoiceNumber} is ready. You can download the PDF invoice or copy the customer tracking link above.`}
        />
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <OrderProgress order={order} />
          </Card>
          <Card title={`Items (${order.items.length})`}>
            <OrderItemsList order={order} admin />
            <div className="border-line mt-2 border-t pt-4 sm:ml-auto sm:max-w-xs">
              <OrderTotals order={order} admin />
            </div>
          </Card>
          <SupplierFulfillmentCard supplierOrders={supplierOrders} productMeta={productMeta} />
          {order.returnedItems && order.returnedItems.length > 0 && (
            <Card title="Returned items">
              <ul className="divide-line divide-y text-sm">
                {order.returnedItems.map((ri, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 py-2">
                    <div>
                      <p className="text-ink font-medium">
                        {ri.name} × {ri.quantity}
                      </p>
                      <p className="text-subtle text-xs">
                        {ri.restocked ? 'Restocked to inventory' : 'Not restocked'}
                      </p>
                    </div>
                    <Taka amount={ri.lineTotal} className="font-semibold" />
                  </li>
                ))}
              </ul>
              {order.refundedAmount != null && order.refundedAmount > 0 && (
                <p className="text-muted mt-2 text-right text-xs">
                  Total refunded: <Taka amount={order.refundedAmount} className="text-ink font-semibold" />
                </p>
              )}
            </Card>
          )}
          <Card title="History">
            <ol className="space-y-3">
              {[...order.statusHistory].reverse().map((e, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="bg-brand-400 mt-1.5 size-2 shrink-0 rounded-full" />
                  <div>
                    <p className="text-ink">
                      <OrderStatusBadge status={e.status} />
                      {e.note && <span className="text-muted ml-2">{e.note}</span>}
                    </p>
                    <p className="text-subtle mt-0.5 text-xs">
                      {formatStoreDateTime(e.at)}
                      {e.byName ? ` · by ${e.byName}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <OrderActions order={order} />
          <Card title="Customer">
            <p className="text-ink font-semibold">{order.customer.name}</p>
            <p className="text-muted text-sm">
              <a href={`tel:${order.customer.phone}`} className="hover:underline">
                {order.customer.phone}
              </a>
              {order.customer.email && <> · {order.customer.email}</>}
            </p>
            {order.userId ? (
              <Link
                href={`/admin/customers/${order.userId}`}
                className="text-accent mt-2 inline-block text-sm font-semibold hover:underline"
              >
                View customer profile →
              </Link>
            ) : (
              <p className="text-subtle mt-2 text-xs">Guest order (no account)</p>
            )}
          </Card>
          <Card title="Delivery address">
            <ShippingAddressBlock order={order} />
          </Card>
          <Card title="Payment">
            <p className="text-sm">
              {PAYMENT_METHOD_LABELS[order.paymentMethod]} ·{' '}
              <span className="font-semibold capitalize">{order.paymentStatus}</span>
            </p>
          </Card>
          {order.customerNote && (
            <Card title="Customer note">
              <p className="text-base-700 text-sm">{order.customerNote}</p>
            </Card>
          )}
          {order.returnRequest && (
            <Card title="Return request">
              <div className="flex items-center justify-between">
                <span className="text-sm">{order.returnRequest.reason}</span>
                <ReturnStatusBadge status={order.returnRequest.status} />
              </div>
              <Link
                href="/admin/returns"
                className="text-accent mt-2 inline-block text-sm font-semibold hover:underline"
              >
                Manage returns →
              </Link>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="bg-panel hairline rounded-xl2 p-5">
      {title && <h2 className="text-ink mb-3 text-[14px] font-semibold">{title}</h2>}
      {children}
    </section>
  );
}
