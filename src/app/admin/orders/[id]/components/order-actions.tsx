'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { updateOrderMetaAction, updateOrderStatusAction } from '@/actions/admin';
import { Taka } from '@/features/products/price';
import type { OrderDTO } from '@/types';
import { Icon } from '@components/icon/icon';
import { ConfirmDialog } from '@components/shared';
import { Button } from '@components/ui/button';
import { Checkbox } from '@components/ui/checkbox';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { Input } from '@components/ui/input';
import { Select } from '@components/ui/select';
import { Textarea } from '@components/ui/textarea';
import { handleActionResult } from '@lib/action-client';
import {
  ADMIN_ORDER_TRANSITIONS,
  ORDER_STATUS_LABELS,
  type OrderStatus,
  PAYMENT_STATUS_TRANSITIONS,
  type PaymentStatus,
  RETURN_WINDOW_HOURS,
} from '@lib/constants';

const ORDER_ACTIONS_EXPIRY_MS = 3 * 24 * 60 * 60 * 1000;
const AUTO_HIDE_STATUSES: ReadonlySet<OrderStatus> = new Set([
  'delivered',
  'completed',
  'cancelled',
  'returned',
]);

function getStatusEnteredAt(order: OrderDTO): number | null {
  if ((order.status === 'delivered' || order.status === 'completed') && order.deliveredAt) {
    return new Date(order.deliveredAt).getTime();
  }
  for (let i = order.statusHistory.length - 1; i >= 0; i--) {
    const entry = order.statusHistory[i];
    if (entry?.status === order.status) {
      return new Date(entry.at).getTime();
    }
  }
  const last = order.statusHistory[order.statusHistory.length - 1];
  return last ? new Date(last.at).getTime() : new Date(order.updatedAt).getTime();
}

/** Moves the order along its workflow (including flexible cancel/return), plus payment & notes. */
export function OrderActions({ order }: { order: OrderDTO }) {
  const router = useRouter();
  const isPostDelivery = order.status === 'delivered' || order.status === 'completed';
  const [now] = React.useState(() => Date.now());
  const enteredAt = AUTO_HIDE_STATUSES.has(order.status) ? getStatusEnteredAt(order) : null;
  const isActionsExpired =
    enteredAt !== null && Number.isFinite(enteredAt) && now - enteredAt >= ORDER_ACTIONS_EXPIRY_MS;
  const withinReturnWindow =
    !isPostDelivery ||
    (!!order.deliveredAt &&
      now - new Date(order.deliveredAt).getTime() <= RETURN_WINDOW_HOURS * 3600 * 1000);
  const next = ADMIN_ORDER_TRANSITIONS[order.status].filter(
    (s) => s !== 'returned' || withinReturnWindow,
  );
  const [selectedStatus, setSelectedStatus] = React.useState<OrderStatus | ''>(next[0] ?? '');
  const effectiveStatus: OrderStatus | '' =
    selectedStatus && next.includes(selectedStatus) ? selectedStatus : (next[0] ?? '');
  const [note, setNote] = React.useState('');
  const [confirm, setConfirm] = React.useState<OrderStatus | null>(null);
  const [metaConfirm, setMetaConfirm] = React.useState(false);
  const [returnOpen, setReturnOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const nextPayments = PAYMENT_STATUS_TRANSITIONS[order.paymentStatus];
  const [payment, setPayment] = React.useState<PaymentStatus | ''>('');
  const [adminNote, setAdminNote] = React.useState(order.adminNote ?? '');

  const formatPaymentLabel = (p: PaymentStatus) =>
    p === 'unpaid'
      ? order.paymentMethod === 'paymently'
        ? 'Unpaid (Online)'
        : 'Unpaid (COD due)'
      : p === 'paid'
        ? 'Paid'
        : 'Refunded';

  const move = async (status: OrderStatus) => {
    setBusy(true);
    const res = await updateOrderStatusAction({ orderId: order.id, status, note });
    setBusy(false);
    setConfirm(null);
    if (handleActionResult(res)) {
      setNote('');
      router.refresh();
    }
  };

  if (isActionsExpired) return null;

  return (
    <section className="bg-panel hairline rounded-xl2 space-y-5 p-5">
      <div>
        <h2 className="text-ink mb-3 text-[14px] font-semibold">Update status</h2>
        {next.length === 0 ? (
          <p className="text-muted text-sm">
            This order is {ORDER_STATUS_LABELS[order.status].toLowerCase()} — no further steps.
          </p>
        ) : (
          <div className="space-y-2.5">
            <Select
              aria-label="Next status"
              value={effectiveStatus}
              onValueChange={(v) => setSelectedStatus(v as OrderStatus)}
              items={next.map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s] }))}
            />
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Note (optional, e.g. courier, tracking #, or reason)"
            />
            <div className="flex flex-wrap gap-2">
              {effectiveStatus && (
                <Button
                  variant={
                    effectiveStatus === 'cancelled'
                      ? 'danger'
                      : effectiveStatus === 'returned'
                        ? 'secondary'
                        : 'primary'
                  }
                  disabled={busy}
                  onClick={() => {
                    if (effectiveStatus === 'returned') setReturnOpen(true);
                    else setConfirm(effectiveStatus);
                  }}
                >
                  {effectiveStatus === 'cancelled' && <Icon name="cancelCircle" size={15} />}
                  Mark as {ORDER_STATUS_LABELS[effectiveStatus]}
                </Button>
              )}
              {next.includes('cancelled') && effectiveStatus !== 'cancelled' && (
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => setConfirm('cancelled')}
                >
                  <Icon name="cancelCircle" size={15} /> Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-line space-y-2.5 border-t pt-5">
        <h2 className="text-ink text-[14px] font-semibold">Payment & internal note</h2>
        {nextPayments.length === 0 ? (
          <p className="text-muted text-sm">
            Payment:{' '}
            <span className="text-ink font-medium">{formatPaymentLabel(order.paymentStatus)}</span>{' '}
            — no further changes.
          </p>
        ) : (
          <Select
            aria-label="Payment status"
            value={payment}
            onValueChange={(v) => setPayment(v as PaymentStatus)}
            placeholder={formatPaymentLabel(order.paymentStatus)}
            clearable
            onClear={() => setPayment('')}
            items={nextPayments.map((p) => ({
              value: p,
              label: formatPaymentLabel(p),
            }))}
          />
        )}
        <Textarea
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          rows={3}
          placeholder="Only visible to admins"
        />
        <Button
          variant="primary"
          disabled={busy}
          onClick={() => setMetaConfirm(true)}
        >
          Save
        </Button>
      </div>

      <ConfirmDialog
        open={metaConfirm}
        onOpenChange={(o) => !o && setMetaConfirm(false)}
        tone="info"
        title="Save payment & internal note?"
        description="The order’s payment status and internal admin note will be updated."
        confirmLabel="Save"
        loading={busy}
        autoClose={false}
        onConfirm={async () => {
          setBusy(true);
          const res = await updateOrderMetaAction({
            orderId: order.id,
            paymentStatus: payment || order.paymentStatus,
            adminNote,
          });
          setBusy(false);
          setMetaConfirm(false);
          if (handleActionResult(res)) {
            setPayment('');
            router.refresh();
          }
        }}
      />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        tone={confirm === 'cancelled' ? 'danger' : 'info'}
        title={
          confirm === 'cancelled'
            ? 'Cancel this order?'
            : `Mark as ${confirm ? ORDER_STATUS_LABELS[confirm] : ''}?`
        }
        description={
          confirm === 'cancelled'
            ? 'The order will be marked cancelled, excluded from revenue, and any deducted inventory will be restored once.'
            : confirm === 'delivered'
              ? 'Cash on Delivery orders are marked as paid. The customer’s return window starts now.'
              : 'The order status and history will be updated.'
        }
        confirmLabel={confirm === 'cancelled' ? 'Cancel order' : 'Confirm'}
        loading={busy}
        autoClose={false}
        onConfirm={() => confirm && move(confirm)}
      />

      {returnOpen && (
        <ReturnOrderDialog
          order={order}
          initialNote={note}
          onClose={() => setReturnOpen(false)}
        />
      )}
    </section>
  );
}

function ReturnOrderDialog({
  order,
  initialNote,
  onClose,
}: {
  order: OrderDTO;
  initialNote: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const alreadyMap = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const ri of order.returnedItems ?? []) {
      m.set(ri.orderItemId, (m.get(ri.orderItemId) ?? 0) + ri.quantity);
    }
    return m;
  }, [order.returnedItems]);

  const [rows, setRows] = React.useState(() =>
    order.items.map((item) => {
      const remaining = Math.max(0, item.quantity - (alreadyMap.get(item.id) ?? 0));
      return {
        orderItemId: item.id,
        name: item.name,
        unitPrice: item.unitPrice,
        remaining,
        quantity: remaining,
        restock: true,
      };
    }),
  );
  const [note, setNote] = React.useState(initialNote);
  const [refundOverride, setRefundOverride] = React.useState('');
  const [customerPaidDelivery, setCustomerPaidDelivery] = React.useState<boolean | null>(null);
  const [deliveryExpenseAmount, setDeliveryExpenseAmount] = React.useState(
    String(order.shippingFee ?? 0),
  );
  const [busy, setBusy] = React.useState(false);

  const computedRefund = rows.reduce((s, r) => s + r.quantity * r.unitPrice, 0);
  const selectedItems = rows
    .filter((r) => r.quantity > 0)
    .map((r) => ({ orderItemId: r.orderItemId, quantity: r.quantity, restock: r.restock }));
  const parsedDeliveryExpense = Number(deliveryExpenseAmount) || 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customerPaidDelivery === null) return;
    setBusy(true);
    const res = await updateOrderStatusAction({
      orderId: order.id,
      status: 'returned',
      note: note || undefined,
      refundAmount: refundOverride !== '' ? Number(refundOverride) : computedRefund,
      returnItems: selectedItems,
      customerPaidDelivery,
      returnDeliveryExpenseAmount:
        customerPaidDelivery === false && parsedDeliveryExpense > 0
          ? parsedDeliveryExpense
          : undefined,
    });
    setBusy(false);
    if (handleActionResult(res)) {
      onClose();
      router.refresh();
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Process Return — {order.orderNumber}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-muted text-sm">
              Select quantities to return (supports partial or full returns) and whether to restore
              them to inventory.
            </p>
            <div className="divide-line border-line divide-y rounded-lg border">
              {rows.map((r, idx) => (
                <div key={r.orderItemId} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-ink truncate font-medium">{r.name}</p>
                    <p className="text-subtle text-xs">
                      <Taka amount={r.unitPrice} /> each · {r.remaining} returnable
                    </p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={r.remaining}
                    value={r.quantity}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(r.remaining, Number(e.target.value) || 0));
                      setRows((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, quantity: val } : x)),
                      );
                    }}
                    className="h-9 w-20 text-right"
                    aria-label={`Return quantity for ${r.name}`}
                  />
                  <label className="text-muted flex items-center gap-1.5 text-xs">
                    <Checkbox
                      checked={r.restock}
                      onCheckedChange={(c) =>
                        setRows((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, restock: Boolean(c) } : x)),
                        )
                      }
                    />
                    Restock
                  </label>
                </div>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="type-label mb-1 block">
                  Refund amount (default <Taka amount={computedRefund} />)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={refundOverride}
                  onChange={(e) => setRefundOverride(e.target.value)}
                  placeholder={String(computedRefund)}
                />
              </div>
              <div>
                <label className="type-label mb-1 block">Return note</label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reason / courier note"
                />
              </div>
            </div>
            <div className="border-line bg-well/40 space-y-3 rounded-lg border p-3.5">
              <div>
                <p className="text-ink text-sm font-semibold">
                  Did the customer pay the delivery charge?
                </p>
                <p className="text-subtle text-xs">
                  Order delivery fee: <Taka amount={order.shippingFee} />. If not paid by the
                  customer, it will be recorded in Expenses.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={customerPaidDelivery === true ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setCustomerPaidDelivery(true)}
                >
                  Yes, customer paid
                </Button>
                <Button
                  type="button"
                  variant={customerPaidDelivery === false ? 'danger' : 'secondary'}
                  size="sm"
                  onClick={() => setCustomerPaidDelivery(false)}
                >
                  No, add to Expenses
                </Button>
              </div>
              {customerPaidDelivery === false && (
                <div>
                  <label className="type-label mb-1 block">
                    Delivery charge expense (BDT)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={deliveryExpenseAmount}
                    onChange={(e) => setDeliveryExpenseAmount(e.target.value)}
                  />
                  <p className="text-subtle mt-1 text-xs">
                    Will be added under Delivery / Courier Charges in Expenses.
                  </p>
                </div>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={busy || selectedItems.length === 0 || customerPaidDelivery === null}
            >
              {busy ? 'Processing…' : 'Confirm Return'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
