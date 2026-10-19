'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { updateOrderMetaAction, updateOrderStatusAction } from '@/actions/admin';
import type { OrderDTO } from '@/types';
import { Icon } from '@components/icon/icon';
import { ConfirmDialog } from '@components/shared';
import { Button } from '@components/ui/button';
import { Select } from '@components/ui/select';
import { Textarea } from '@components/ui/textarea';
import { handleActionResult } from '@lib/action-client';
import {
  ORDER_STATUS_LABELS,
  ORDER_TRANSITIONS,
  type OrderStatus,
  PAYMENT_STATUSES,
} from '@lib/constants';

/** Moves the order along its workflow, plus payment status and internal notes. */
export function OrderActions({ order }: { order: OrderDTO }) {
  const router = useRouter();
  const next = ORDER_TRANSITIONS[order.status];
  const [note, setNote] = React.useState('');
  const [confirm, setConfirm] = React.useState<OrderStatus | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [payment, setPayment] = React.useState(order.paymentStatus);
  const [adminNote, setAdminNote] = React.useState(order.adminNote ?? '');

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
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Note (optional, e.g. courier & tracking number)"
            />
            <div className="flex flex-wrap gap-2">
              {next.map((s) =>
                s === 'cancelled' ? (
                  <Button key={s} variant="secondary" disabled={busy} onClick={() => setConfirm(s)}>
                    <Icon name="cancelCircle" size={15} /> Cancel order
                  </Button>
                ) : (
                  <Button key={s} variant="primary" disabled={busy} onClick={() => setConfirm(s)}>
                    Mark as {ORDER_STATUS_LABELS[s]}
                  </Button>
                ),
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-line space-y-2.5 border-t pt-5">
        <h2 className="text-ink text-[14px] font-semibold">Payment & internal note</h2>
        <Select
          aria-label="Payment status"
          value={payment}
          onValueChange={(v) => setPayment(v as typeof payment)}
          items={PAYMENT_STATUSES.map((p) => ({
            value: p,
            label: p === 'unpaid' ? 'Unpaid (COD due)' : p === 'paid' ? 'Paid' : 'Refunded',
          }))}
        />
        <Textarea
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          rows={3}
          placeholder="Only visible to admins"
        />
        <Button
          variant="secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const res = await updateOrderMetaAction({
              orderId: order.id,
              paymentStatus: payment,
              adminNote,
            });
            setBusy(false);
            if (handleActionResult(res)) router.refresh();
          }}
        >
          Save
        </Button>
      </div>

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
            ? 'The customer will see the order as cancelled. This cannot be undone.'
            : confirm === 'delivered'
              ? 'Cash on Delivery orders are marked as paid. The customer’s return window starts now.'
              : 'The customer will see the new status on their order page.'
        }
        confirmLabel={confirm === 'cancelled' ? 'Cancel order' : 'Confirm'}
        loading={busy}
        autoClose={false}
        onConfirm={() => confirm && move(confirm)}
      />
    </section>
  );
}
