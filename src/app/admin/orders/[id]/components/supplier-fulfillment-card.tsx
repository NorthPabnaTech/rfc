'use client';

import * as React from 'react';
import { useRouter } from 'nextjs-toploader/app';

import {
  confirmAndSendSupplierOrderAction,
  refreshSupplierOrderStatusAction,
} from '@/actions/admin';
import { Taka } from '@/features/products/price';
import type { SupplierOrderDTO } from '@/types';
import { Icon } from '@components/icon/icon';
import { Callout, ConfirmDialog, StatusBadge } from '@components/shared';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { SUPPLIER_ORDER_STATUS_LABELS, type SupplierOrderStatus } from '@lib/constants';
import { toast } from '@lib/toast';
import { formatStoreDateTime } from '@lib/utils';

export type SupplierOrderProductMeta = {
  supplierMinSellingPrice?: {
    customerPaysDelivery: number;
    resellerPaysDeliveryInsideDhaka: number;
    resellerPaysDeliveryOutsideDhaka: number;
  };
  supplierVariants?: {
    externalVariantId: string;
    color?: string | null;
    size?: string | null;
    stockQuantity: number;
    inStock: boolean;
  }[];
};

function statusTone(status: SupplierOrderStatus): 'ok' | 'warn' | 'danger' | 'neutral' | 'info' {
  switch (status) {
    case 'delivered':
    case 'shipped':
      return 'ok';
    case 'submitted':
    case 'processing':
      return 'info';
    case 'awaiting_confirmation':
    case 'pending_payment':
      return 'warn';
    case 'failed':
      return 'danger';
    default:
      return 'neutral';
  }
}

function parseSyncedNote(note?: string): {
  externalStatus: string | null;
  displayNote: string | undefined;
} {
  if (!note) return { externalStatus: null, displayNote: note };
  const match = note.match(/^(Status synced from .+?):\s*(.+)$/i);
  if (!match) return { externalStatus: null, displayNote: note };
  return {
    externalStatus: match[2]!.trim(),
    displayNote: match[1]!.trim(),
  };
}

function formatExternalStatusLabel(ext: string): string {
  return ext
    .trim()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function externalStatusTone(ext: string): 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'locked' {
  const s = ext.toUpperCase();
  if (['DELIVERED', 'COMPLETED', 'SHIPPED'].includes(s)) return 'ok';
  if (['COURIER_CREATED', 'IN_TRANSIT', 'DISPATCHED'].includes(s)) return 'locked';
  if (['CONFIRMED', 'PROCESSING', 'PACKAGING', 'APPROVED'].includes(s)) return 'info';
  if (['PENDING_REVIEW', 'PENDING', 'PENDING_PAYMENT', 'AWAITING_CONFIRMATION'].includes(s)) {
    return 'warn';
  }
  if (['CANCELLED', 'FAILED', 'RETURNED', 'REJECTED'].includes(s)) return 'danger';
  return 'neutral';
}

export function SupplierFulfillmentCard({
  supplierOrders,
  productMeta,
}: {
  supplierOrders: SupplierOrderDTO[];
  productMeta: Record<string, SupplierOrderProductMeta>;
}) {
  if (!supplierOrders.length) return null;

  return (
    <div className="bg-surface hairline rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-ink text-[15px] font-bold">Supplier Fulfillment (API Dropshipping)</h2>
          <p className="text-subtle text-xs">
            Orders are never sent automatically. Review pricing, variant, and delivery before
            confirming.
          </p>
        </div>
        <Badge tone="brand">{supplierOrders.length} linked</Badge>
      </div>

      <div className="space-y-5">
        {supplierOrders.map((so) => (
          <SupplierOrderItemCard
            key={so.id}
            so={so}
            meta={productMeta[so.productId]}
          />
        ))}
      </div>
    </div>
  );
}

function SupplierOrderItemCard({
  so,
  meta,
}: {
  so: SupplierOrderDTO;
  meta?: SupplierOrderProductMeta;
}) {
  const router = useRouter();
  const [sellingPrice, setSellingPrice] = React.useState(String(so.sellingPrice));
  const [variantId, setVariantId] = React.useState(so.externalVariantId ?? '');
  const [paidByCustomer, setPaidByCustomer] = React.useState(so.deliveryChargePaidByCustomer);
  const [paidUpfront, setPaidUpfront] = React.useState(so.deliveryChargePaidUpfront);
  const [customerNote, setCustomerNote] = React.useState(so.customerNote ?? '');
  const [allowDuplicate, setAllowDuplicate] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const canSubmit = so.status === 'awaiting_confirmation' || so.status === 'failed';
  const variants = meta?.supplierVariants ?? [];
  const insideDhaka =
    so.customer.district.trim().toLowerCase() === 'dhaka' ||
    (so.customer.division.trim().toLowerCase() === 'dhaka' && !so.customer.district.trim());

  const parsedPrice = Number(sellingPrice) || 0;
  const minRules = meta?.supplierMinSellingPrice;
  const requiredMinUnit = minRules
    ? paidByCustomer
      ? minRules.customerPaysDelivery
      : insideDhaka
        ? minRules.resellerPaysDeliveryInsideDhaka
        : minRules.resellerPaysDeliveryOutsideDhaka
    : 0;
  const requiredMinTotal = requiredMinUnit * so.quantity;
  const expectedProfit =
    parsedPrice - so.costPrice - so.packagingCost - (paidByCustomer ? 0 : so.deliveryCharge);

  const priceError =
    parsedPrice <= so.costPrice
      ? `Selling price must be greater than cost price (৳${so.costPrice}).`
      : requiredMinTotal > 0 && parsedPrice < requiredMinTotal
        ? `Below supplier minimum selling price (৳${requiredMinTotal}).`
        : null;

  const variantError =
    variants.length > 0 && !variantId ? 'Select a supplier variant before sending.' : null;

  const handleConfirmAndSend = async () => {
    setSubmitting(true);
    const res = await confirmAndSendSupplierOrderAction({
      supplierOrderId: so.id,
      sellingPrice: parsedPrice,
      externalVariantId: variantId || undefined,
      deliveryChargePaidByCustomer: paidByCustomer,
      deliveryChargePaidUpfront: paidByCustomer ? paidUpfront : false,
      customerNote: customerNote.trim() || undefined,
      allowDuplicate,
    });
    setSubmitting(false);
    setConfirmOpen(false);
    if (!res.ok) {
      toast.error(res.error);
      router.refresh();
      return;
    }
    toast.success(`Sent to ${so.supplierName}`);
    router.refresh();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const res = await refreshSupplierOrderStatusAction(so.id);
    setRefreshing(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success('Supplier order status updated');
    router.refresh();
  };

  return (
    <div className="bg-well/50 hairline space-y-4 rounded-xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-ink text-sm font-bold">
            {so.productName} × {so.quantity}
          </p>
          <p className="text-subtle text-xs">
            {so.supplierName} · Supplier Product ID: {so.externalProductId}
            {so.externalOrderId ? ` · Supplier Order ID: ${so.externalOrderId}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge
            status={statusTone(so.status)}
            label={SUPPLIER_ORDER_STATUS_LABELS[so.status]}
          />
          {so.externalOrderId && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={refreshing}
              onClick={handleRefresh}
            >
              <Icon name="refresh" size={13} className={refreshing ? 'animate-spin' : undefined} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {so.status === 'pending_payment' && (
        <Callout tone="warn" title="Supplier Payment Pending (PENDING_PAYMENT)">
          The supplier accepted this order in PENDING_PAYMENT status (insufficient supplier balance
          or auto-payment disabled). Complete payment on {so.supplierName} and refresh status.
        </Callout>
      )}

      {so.isDuplicate && (
        <Callout tone="info" title="Duplicate order returned by supplier">
          Business Koro matched an existing order within the 10-minute duplicate window.
        </Callout>
      )}

      {so.lastError && (
        <Callout tone="danger" title="Last supplier API error">
          {so.lastError}
        </Callout>
      )}

      {canSubmit ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-ink mb-1 block text-xs font-semibold">
                Selling Price (BDT)
              </label>
              <input
                type="number"
                min={1}
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="input-flat h-9 w-full px-3 text-sm"
              />
            </div>

            {variants.length > 0 && (
              <div>
                <label className="text-ink mb-1 block text-xs font-semibold">
                  Supplier Variant
                </label>
                <select
                  value={variantId}
                  onChange={(e) => setVariantId(e.target.value)}
                  className="input-flat h-9 w-full px-3 text-sm"
                >
                  <option value="">Choose variant…</option>
                  {variants.map((v) => {
                    const label =
                      [v.color, v.size].filter(Boolean).join(' / ') || v.externalVariantId;
                    return (
                      <option
                        key={v.externalVariantId}
                        value={v.externalVariantId}
                        disabled={!v.inStock}
                      >
                        {label} ({v.inStock ? `${v.stockQuantity} in stock` : 'Out of stock'})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-xs">
            <label className="text-ink flex cursor-pointer items-center gap-2 font-medium">
              <input
                type="checkbox"
                checked={paidByCustomer}
                onChange={(e) => setPaidByCustomer(e.target.checked)}
                className="accent-brand size-4 rounded"
              />
              Customer pays delivery (৳{so.deliveryCharge}{' '}
              {insideDhaka ? 'Inside Dhaka' : 'Outside Dhaka'})
            </label>
            {paidByCustomer && (
              <label className="text-ink flex cursor-pointer items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={paidUpfront}
                  onChange={(e) => setPaidUpfront(e.target.checked)}
                  className="accent-brand size-4 rounded"
                />
                Delivery already paid upfront to RFC Gadget
              </label>
            )}
          </div>

          <div>
            <label className="text-ink mb-1 block text-xs font-semibold">
              Note for supplier (optional)
            </label>
            <input
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="Delivery instructions…"
              className="input-flat h-9 w-full px-3 text-sm"
            />
          </div>

          {/* Profitability breakdown */}
          <div className="bg-surface grid grid-cols-2 gap-2 rounded-xl p-3 text-xs sm:grid-cols-5">
            <div>
              <span className="text-subtle block">Selling</span>
              <Taka amount={parsedPrice} className="text-ink font-semibold" />
            </div>
            <div>
              <span className="text-subtle block">Cost</span>
              <Taka amount={so.costPrice} className="text-ink font-semibold" />
            </div>
            <div>
              <span className="text-subtle block">Packaging</span>
              <Taka amount={so.packagingCost} className="text-ink font-semibold" />
            </div>
            <div>
              <span className="text-subtle block">Delivery (You)</span>
              <Taka
                amount={paidByCustomer ? 0 : so.deliveryCharge}
                className="text-ink font-semibold"
              />
            </div>
            <div>
              <span className="text-subtle block">Expected Profit</span>
              <Taka
                amount={expectedProfit}
                className={
                  expectedProfit > 0
                    ? 'font-bold text-[var(--status-ok-fg)]'
                    : 'text-danger font-bold'
                }
              />
            </div>
          </div>

          {(priceError || variantError) && (
            <Callout tone="danger" title="Validation required before sending">
              {priceError || variantError}
            </Callout>
          )}

          {so.status === 'failed' && (
            <label className="text-ink flex cursor-pointer items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={allowDuplicate}
                onChange={(e) => setAllowDuplicate(e.target.checked)}
                className="accent-brand size-4 rounded"
              />
              Allow duplicate order submission (only if intentionally resending within 10 minutes)
            </label>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={submitting || Boolean(priceError) || Boolean(variantError)}
              onClick={() => setConfirmOpen(true)}
            >
              <Icon name="check" size={14} />
              {submitting ? 'Sending to Supplier…' : 'Confirm & Send to Supplier'}
            </Button>
          </div>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={(o) => !o && !submitting && setConfirmOpen(false)}
            tone="info"
            title={`Send order to ${so.supplierName}?`}
            description={`Submit ${so.productName} × ${so.quantity} to ${so.supplierName} with Selling Price ৳${parsedPrice} (Cost ৳${so.costPrice}, Packaging ৳${so.packagingCost}, Expected Profit ৳${expectedProfit}).`}
            confirmLabel="Confirm & Send"
            loading={submitting}
            autoClose={false}
            onConfirm={handleConfirmAndSend}
          />
        </div>
      ) : (
        <div className="bg-surface grid grid-cols-2 gap-3 rounded-xl p-3 text-xs sm:grid-cols-4">
          <div>
            <span className="text-subtle block">Selling Price</span>
            <Taka amount={so.sellingPrice} className="text-ink font-semibold" />
          </div>
          <div>
            <span className="text-subtle block">Cost + Packaging</span>
            <Taka amount={so.costPrice + so.packagingCost} className="text-ink font-semibold" />
          </div>
          <div>
            <span className="text-subtle block">Expected Profit</span>
            <Taka amount={so.expectedProfit} className="font-bold text-[var(--status-ok-fg)]" />
          </div>
          <div>
            <span className="text-subtle block">Submitted</span>
            <span className="text-ink font-medium">
              {so.submittedAt ? formatStoreDateTime(so.submittedAt) : '—'}
              {so.confirmedByName ? ` by ${so.confirmedByName}` : ''}
            </span>
          </div>
          {so.variantLabel && (
            <div>
              <span className="text-subtle block">Variant</span>
              <span className="text-ink font-medium">{so.variantLabel}</span>
            </div>
          )}
          {so.externalStatus && (
            <div>
              <span className="text-subtle block">Supplier Status</span>
              <span className="text-ink font-medium">{so.externalStatus}</span>
            </div>
          )}
          {so.paymentStatus && (
            <div>
              <span className="text-subtle block">Supplier Payment</span>
              <span className="text-ink font-medium">{so.paymentStatus}</span>
            </div>
          )}
          {so.lastSyncedAt && (
            <div>
              <span className="text-subtle block">Last Synced</span>
              <span className="text-ink font-medium">{formatStoreDateTime(so.lastSyncedAt)}</span>
            </div>
          )}
        </div>
      )}

      {so.statusHistory.length > 0 && (
        <details className="text-xs">
          <summary className="text-subtle hover:text-ink cursor-pointer font-medium">
            Supplier submission history ({so.statusHistory.length})
          </summary>
          <ol className="mt-3">
            {[...so.statusHistory].reverse().map((ev, idx, arr) => {
              const { externalStatus, displayNote } = parseSyncedNote(ev.note);
              return (
                <li key={idx} className="relative flex gap-3.5 pb-5 text-sm last:pb-0">
                  {idx < arr.length - 1 && (
                    <span
                      aria-hidden
                      className="bg-line absolute top-4 bottom-0 left-[5px] w-0.5 -translate-x-1/2"
                    />
                  )}
                  <span className="bg-brand-400 ring-panel relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full ring-2" />
                  <div className="min-w-0 flex-1">
                    <div>
                      {externalStatus ? (
                        <StatusBadge
                          status={externalStatusTone(externalStatus)}
                          label={formatExternalStatusLabel(externalStatus)}
                        />
                      ) : (
                        <StatusBadge
                          status={statusTone(ev.status)}
                          label={SUPPLIER_ORDER_STATUS_LABELS[ev.status]}
                        />
                      )}
                    </div>
                    {displayNote && (
                      <p className="text-muted mt-1 text-xs leading-relaxed break-words">
                        {displayNote}
                      </p>
                    )}
                    <p className="text-subtle mt-1 text-xs">{formatStoreDateTime(ev.at)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </details>
      )}
    </div>
  );
}
