import { Taka } from '@/features/products/price';
import { ProductImage } from '@/features/products/product-image';
import type { OrderDTO, SupplierOrderDTO } from '@/types';
import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { StatusBadge } from '@components/shared/status-badge';
import {
  ORDER_FLOW,
  ORDER_STATUS_LABELS,
  type OrderStatus,
  RETURN_STATUS_LABELS,
  type ReturnStatus,
  SHIPPING_ZONE_LABELS,
} from '@lib/constants';
import { cn, formatStoreDateTime } from '@lib/utils';

type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'locked';

const ORDER_TONE: Record<OrderStatus, Tone> = {
  pending: 'warn',
  confirmed: 'info',
  processing: 'info',
  shipped: 'locked',
  delivered: 'ok',
  completed: 'ok',
  cancelled: 'danger',
  returned: 'neutral',
};

const RETURN_TONE: Record<ReturnStatus, Tone> = {
  pending: 'warn',
  approved: 'info',
  rejected: 'danger',
  picked_up: 'locked',
  refunded: 'ok',
  closed: 'neutral',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <StatusBadge status={ORDER_TONE[status]} label={ORDER_STATUS_LABELS[status]} />;
}

export function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  return <StatusBadge status={RETURN_TONE[status]} label={RETURN_STATUS_LABELS[status]} />;
}

const STEP_ICON: Record<OrderStatus, IconRegistryKey> = {
  pending: 'clock',
  confirmed: 'checkCircle',
  processing: 'processing',
  shipped: 'shipping',
  delivered: 'delivered',
  completed: 'badgeCheck',
  cancelled: 'cancelCircle',
  returned: 'refresh',
};

/** Horizontal progress tracker along the happy-path status flow. */
export function OrderProgress({ order }: { order: Pick<OrderDTO, 'status' | 'statusHistory'> }) {
  if (order.status === 'cancelled' || order.status === 'returned') {
    const event = [...order.statusHistory].reverse().find((e) => e.status === order.status);
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-[var(--status-danger-bg)] px-5 py-4 text-[var(--status-danger-fg)]">
        <Icon name={STEP_ICON[order.status]} size={22} />
        <div>
          <p className="font-semibold">
            This order was {ORDER_STATUS_LABELS[order.status].toLowerCase()}
          </p>
          {event && (
            <p className="text-sm opacity-80">
              {formatStoreDateTime(event.at)}
              {event.note ? ` · ${event.note}` : ''}
            </p>
          )}
        </div>
      </div>
    );
  }

  const currentIdx =
    order.status === 'completed' ? ORDER_FLOW.length - 1 : ORDER_FLOW.indexOf(order.status);
  const reachedAt = (s: OrderStatus) => order.statusHistory.find((e) => e.status === s)?.at;

  return (
    <ol className="flex flex-col sm:grid sm:grid-cols-5 sm:gap-1">
      {ORDER_FLOW.map((s, i) => {
        const done = i <= currentIdx;
        const at = reachedAt(s);
        return (
          <li
            key={s}
            className="relative flex items-start gap-3.5 pb-6 last:pb-0 sm:flex-col sm:items-center sm:gap-0 sm:pb-0 sm:text-center"
          >
            {i < ORDER_FLOW.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  'absolute top-10 bottom-0 left-5 w-0.5 -translate-x-1/2 sm:hidden',
                  i < currentIdx ? 'bg-brand-400' : 'bg-line',
                )}
              />
            )}
            {i > 0 && (
              <span
                aria-hidden
                className={cn(
                  'absolute top-5 right-1/2 hidden h-0.5 w-full sm:block',
                  i <= currentIdx ? 'bg-brand-400' : 'bg-line',
                )}
              />
            )}
            <span
              className={cn(
                'relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-2 transition',
                done ? 'bg-noir border-noir text-brand-300' : 'border-line text-subtle bg-white',
                i === currentIdx && 'ring-brand-200 ring-4',
              )}
            >
              <Icon name={STEP_ICON[s]} size={17} />
            </span>
            <div className="flex min-h-10 flex-col justify-center sm:mt-2 sm:min-h-0 sm:items-center">
              <span
                className={cn(
                  'text-sm font-semibold sm:text-xs',
                  done ? 'text-ink' : 'text-subtle',
                )}
              >
                {ORDER_STATUS_LABELS[s]}
              </span>
              {at && (
                <span className="text-subtle text-xs sm:text-[10px]">
                  {formatStoreDateTime(at, 'DD MMM, h:mm A')}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderItemsList({ order, admin = false }: { order: OrderDTO; admin?: boolean }) {
  return (
    <ul className="divide-line divide-y">
      {order.items.map((it) => (
        <li key={it.id} className="flex gap-4 py-4">
          <span className="bg-cream relative size-16 shrink-0 overflow-hidden rounded-xl">
            <ProductImage src={it.image} alt={it.name} fill sizes="64px" />
          </span>
          <div className="min-w-0 flex-1">
            <a
              href={
                admin
                  ? `/admin/products?q=${encodeURIComponent(it.sku ?? it.name)}`
                  : `/products/${it.slug}`
              }
              className="text-ink hover:text-accent line-clamp-2 text-sm font-semibold"
            >
              {it.name}
            </a>
            <p className="text-muted mt-0.5 text-xs">
              {Object.entries(it.variant)
                .map(([k, v]) => `${k}: ${v}`)
                .join(' · ')}
              {Object.keys(it.variant).length > 0 && ' · '}
              {it.quantity} × <Taka amount={it.unitPrice} />
              {it.sku && ` · SKU ${it.sku}`}
            </p>
            {admin && (
              <p className="text-muted mt-1 flex flex-wrap items-center gap-x-3 text-xs">
                <span>
                  Supplier: <span className="text-ink font-medium">{it.supplierName ?? '—'}</span>
                </span>
                <span>
                  Cost:{' '}
                  <Taka
                    amount={(it.supplierPrice ?? 0) * it.quantity}
                    className="text-ink font-medium"
                  />
                </span>
                {it.supplierProductUrl && (
                  <a
                    href={it.supplierProductUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent inline-flex items-center gap-1 font-semibold hover:underline"
                  >
                    Open on supplier site <Icon name="external" size={12} />
                  </a>
                )}
              </p>
            )}
            {admin && it.components && it.components.length > 0 && (
              <ul className="bg-surface mt-2 space-y-1 rounded-lg px-3 py-2 text-xs">
                <li className="text-subtle font-semibold tracking-wide uppercase">
                  Combo contents
                </li>
                {it.components.map((c) => (
                  <li key={c.name} className="text-ink flex flex-wrap items-center gap-x-2">
                    <span>
                      {c.quantity * it.quantity}× {c.name}
                    </span>
                    <span className="text-muted">· {c.supplierName ?? 'No supplier'}</span>
                    {c.supplierProductUrl && (
                      <a
                        href={c.supplierProductUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent inline-flex items-center gap-0.5 font-semibold hover:underline"
                      >
                        Supplier page <Icon name="external" size={11} />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Taka amount={it.lineTotal} className="text-ink shrink-0 text-sm font-bold" />
        </li>
      ))}
    </ul>
  );
}

export function OrderTotals({
  order,
  admin = false,
  supplierOrders,
}: {
  order: OrderDTO;
  admin?: boolean;
  supplierOrders?: SupplierOrderDTO[];
}) {
  const activeSupplierOrders = (supplierOrders ?? []).filter((so) => so.status !== 'cancelled');
  const resellerDelivery = activeSupplierOrders.reduce(
    (s, so) => s + (!so.deliveryChargePaidByCustomer ? so.deliveryCharge : 0),
    0,
  );
  const packagingCost = activeSupplierOrders.reduce((s, so) => s + (so.packagingCost ?? 0), 0);
  const deliveryCost = resellerDelivery > 0 ? resellerDelivery : order.shippingFee;
  const deliverySubsidy = Math.max(0, resellerDelivery - order.shippingFee);
  const profit = order.total - deliveryCost - (order.supplierCost ?? 0) - packagingCost;
  return (
    <dl className="space-y-2 text-sm">
      <Row label="Subtotal" value={<Taka amount={order.subtotal} />} />
      <Row label="Delivery" value={<Taka amount={order.shippingFee} />} />
      {order.discount > 0 && (
        <Row
          label="Discount"
          value={
            <>
              −<Taka amount={order.discount} />
            </>
          }
        />
      )}
      <div className="border-line flex justify-between border-t pt-2.5 text-base">
        <dt className="text-ink font-semibold">Total</dt>
        <dd className="text-ink font-bold">
          <Taka amount={order.total} />
        </dd>
      </div>
      {admin && order.supplierCost !== undefined && (
        order.platform === 'reseller' && order.resellerSummary ? (
          <>
            <Row
              label="Reseller base price"
              value={<Taka amount={order.resellerSummary.resellerPriceTotal} />}
            />
            <Row label="Supplier cost" value={<Taka amount={order.supplierCost} />} />
            {(order.resellerSummary.packagingCost > 0 || packagingCost > 0) && (
              <Row
                label="Packaging (paid by reseller)"
                value={<Taka amount={order.resellerSummary.packagingCost || packagingCost} />}
              />
            )}
            <Row
              label="Your profit (Admin)"
              value={
                <Taka
                  amount={order.resellerSummary.resellerPriceTotal - order.supplierCost}
                  className={
                    order.resellerSummary.resellerPriceTotal - order.supplierCost >= 0
                      ? 'font-bold text-[var(--status-ok-fg)]'
                      : 'font-bold text-[var(--status-danger-fg)]'
                  }
                />
              }
            />
            <Row
              label="Reseller profit"
              value={
                <Taka
                  amount={order.resellerSummary.expectedResellerProfit}
                  className={
                    order.resellerSummary.expectedResellerProfit >= 0
                      ? 'font-semibold text-[var(--status-ok-fg)]'
                      : 'font-semibold text-[var(--status-danger-fg)]'
                  }
                />
              }
            />
          </>
        ) : (
          <>
            <Row label="Supplier cost" value={<Taka amount={order.supplierCost} />} />
            {deliverySubsidy > 0 && (
              <Row label="Delivery discount (you pay)" value={<Taka amount={deliverySubsidy} />} />
            )}
            {packagingCost > 0 && (
              <Row label="Packaging cost" value={<Taka amount={packagingCost} />} />
            )}
            <Row
              label="Est. profit"
              value={
                <Taka
                  amount={profit}
                  className={
                    profit >= 0 ? 'text-[var(--status-ok-fg)]' : 'text-[var(--status-danger-fg)]'
                  }
                />
              }
            />
          </>
        )
      )}
    </dl>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink font-medium">{value}</dd>
    </div>
  );
}

export function ShippingAddressBlock({ order }: { order: OrderDTO }) {
  const a = order.shippingAddress;
  return (
    <address className="text-base-700 text-sm leading-relaxed not-italic">
      <span className="text-ink font-semibold">{a.fullName}</span>
      {a.phone && (
        <>
          <br />
          {a.phone}
        </>
      )}
      {a.addressLine && (
        <>
          <br />
          {a.addressLine}
        </>
      )}
      <br />
      {[a.area, a.city].filter(Boolean).join(', ')}
      <br />
      <span className="text-muted">{SHIPPING_ZONE_LABELS[a.zone]}</span>
    </address>
  );
}
