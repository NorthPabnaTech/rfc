'use client';

import * as React from 'react';
import Link from 'next/link';

import { useI18n } from '@/i18n/provider';
import { useResellerAuth } from '@/stores/reseller-auth';
import { Panel } from '@components/dashboard/panel';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { NotFoundState } from '@components/platform/not-found-state';
import { StatusPill } from '@components/platform/status-pill';
import { Callout, ConfirmDialog, PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { ApiError } from '@lib/api/client';
import { resellerApi } from '@lib/api/reseller';
import { toast } from '@lib/toast';

import { useSellerOrder } from '../../components/use-seller-data';

export function SellerOrderDetail({ id }: { id: string }) {
  const { t, dateTime, num, money } = useI18n();
  const refreshMe = useResellerAuth((s) => s.refreshMe);
  const { order, loading, reload } = useSellerOrder(id);
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-10 w-64" />
        <div className="skeleton h-80 rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return <NotFoundState title={t('seller.orders.notFound')} backHref="/seller/orders" />;
  }

  const s = order.resellerSummary;
  const c = order.customer;
  const addr = order.shippingAddress;
  const history = order.statusHistory ?? [];
  const canCancel = order.status === 'pending';

  const handleCancelOrder = async () => {
    if (!canCancel || cancelling) return;
    setCancelling(true);
    try {
      await resellerApi.cancelOrder(order.id);
      setConfirmCancel(false);
      await Promise.all([reload(), refreshMe()]);
      toast.success('Order cancelled. Delivery & packaging charges refunded to your wallet.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('common.somethingWrong'));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('seller.orders.detailTitle', { id: order.orderNumber })}
        description={dateTime(order.createdAt)}
        backHref="/seller/orders"
        backLabel={t('nav.myOrders')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill kind="order" value={order.status} className="h-8 px-3" />
            {canCancel && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setConfirmCancel(true)}
              >
                <Icon name="cancelCircle" size={15} />
                Cancel Order
              </Button>
            )}
          </div>
        }
      />

      {order.status === 'cancelled' && (
        <Callout tone="danger" description={t('seller.orders.cancelledNote')} />
      )}
      {order.status === 'returned' && (
        <Callout tone="warn" description={t('seller.orders.returnedNote')} />
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Panel title={t('seller.orders.timeline')}>
            {(() => {
              const FULL_STEPS = [
                { key: 'pending', label: 'Pending' },
                { key: 'confirmed', label: 'Confirmed' },
                { key: 'processing', label: 'Processing' },
                { key: 'shipped', label: 'Shipped' },
                { key: 'delivered', label: 'Delivered' },
              ] as const;

              const historyByStatus = new Map<string, (typeof history)[number]>();
              for (const h of history) {
                historyByStatus.set(h.status.toLowerCase(), h);
              }

              const currentStatus = order.status.toLowerCase();
              const isTerminal = currentStatus === 'cancelled' || currentStatus === 'returned';
              const currentIdx = FULL_STEPS.findIndex((step) => step.key === currentStatus);

              const steps = isTerminal
                ? [
                    ...FULL_STEPS.filter((step) => historyByStatus.has(step.key)).map((step) => ({
                      key: step.key,
                      label: step.label,
                      done: true,
                      isDanger: false,
                      entry: historyByStatus.get(step.key),
                    })),
                    {
                      key: currentStatus,
                      label: currentStatus === 'cancelled' ? 'Cancelled' : 'Returned',
                      done: true,
                      isDanger: true,
                      entry: historyByStatus.get(currentStatus),
                    },
                  ]
                : FULL_STEPS.map((step, idx) => ({
                    key: step.key,
                    label: step.label,
                    done: currentIdx >= 0 ? idx <= currentIdx : historyByStatus.has(step.key),
                    isDanger: false,
                    entry: historyByStatus.get(step.key),
                  }));

              return (
                <ol>
                  {steps.map((step, idx) => {
                    const ts = step.entry?.at || step.entry?.createdAt;
                    const isLast = idx === steps.length - 1;
                    return (
                      <li
                        key={`${step.key}-${idx}`}
                        className="relative flex items-start gap-3 pb-5 last:pb-0"
                      >
                        {!isLast && (
                          <span
                            aria-hidden
                            className={
                              step.done
                                ? 'bg-brand/40 absolute top-8 bottom-0 left-3.5 w-px'
                                : 'bg-line absolute top-8 bottom-0 left-3.5 w-px'
                            }
                          />
                        )}
                        <span
                          className={
                            step.isDanger
                              ? 'relative z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]'
                              : step.done
                                ? 'bg-brand-soft text-brand-ink relative z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full'
                                : 'border-line bg-well text-subtle relative z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border'
                          }
                        >
                          <Icon
                            name={step.isDanger ? 'cancelCircle' : step.done ? 'check' : 'clock'}
                            size={14}
                          />
                        </span>
                        <div className="min-w-0">
                          <p
                            className={
                              step.done
                                ? 'text-ink text-sm font-semibold'
                                : 'text-muted text-sm font-medium'
                            }
                          >
                            {step.label}
                          </p>
                          {step.entry?.note && (
                            <p className="text-muted text-xs">{step.entry.note}</p>
                          )}
                          {ts && (
                            <p className="text-subtle text-[11px]">{dateTime(ts)}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              );
            })()}
          </Panel>

          <Panel title={t('seller.orders.customerInfo')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-ink font-semibold">{c?.name || '—'}</p>
                <p className="num text-muted mt-1 text-[13px]">{c?.phone || '—'}</p>
                {c?.email && <p className="text-muted text-xs">{c.email}</p>}
              </div>
              <div>
                {addr && (
                  <p className="text-muted text-[13px]">
                    {[addr.street, addr.area, addr.district, addr.division]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </div>
            </div>
            {order.customerNote && (
              <Callout tone="neutral" compact className="mt-4" description={order.customerNote} />
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title={t('common.product')}>
            {order.items && order.items.length > 0 ? (
              <ul className="divide-line divide-y">
                {order.items.map((item, i) => (
                  <li key={i} className="py-2.5 first:pt-0 last:pb-0">
                    <p className="text-ink text-sm font-semibold">
                      {item.productName || item.name || item.productId}
                    </p>
                    <p className="text-muted num mt-0.5 text-xs">
                      {num(item.quantity)} × <Money value={item.sellingPrice ?? item.unitPrice ?? 0} />
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted text-sm">Total: <Money value={order.total} /></p>
            )}
          </Panel>

          {s && (
            <Panel title={t('seller.orders.profit')}>
              <Money
                value={
                  order.status === 'cancelled' || order.status === 'returned'
                    ? 0
                    : s.expectedResellerProfit
                }
                className="block text-3xl font-extrabold text-[var(--status-ok-fg)]"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusPill
                  kind="tx"
                  value={s.profitCredited ? 'completed' : 'pending'}
                />
                {s.upfrontRefunded && (
                  <span className="bg-well text-muted rounded-full px-2.5 py-0.5 text-xs font-medium">
                    Upfront Refunded
                  </span>
                )}
              </div>
              <dl className="divide-line mt-4 divide-y border-t pt-2 text-[13px]">
                <div className="flex justify-between py-2">
                  <dt className="text-muted">Reseller Price Total</dt>
                  <dd><Money value={s.resellerPriceTotal} /></dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted">Selling Total</dt>
                  <dd><Money value={s.resellerSellingTotal} /></dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted">{t('invoice.deliveryCharge')}</dt>
                  <dd><Money value={s.deliveryCharge} /></dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted">{t('invoice.packagingCharge')}</dt>
                  <dd><Money value={s.packagingCost} /></dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted">Upfront Deducted</dt>
                  <dd><Money value={s.upfrontDeducted} className="font-semibold" /></dd>
                </div>
              </dl>
            </Panel>
          )}

          <Button variant="outline" className="w-full" asChild>
            <Link href="/seller/support">
              <Icon name="support" size={16} />
              Need help with this order?
            </Link>
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={(o) => !o && !cancelling && setConfirmCancel(false)}
        tone="danger"
        title="Cancel this order?"
        description={
          s && s.upfrontDeducted > 0
            ? `Upfront charges of ${money(s.upfrontDeducted)} (delivery + packaging) will be refunded to your wallet.`
            : 'Are you sure you want to cancel this order?'
        }
        confirmLabel={cancelling ? t('common.loading') : 'Yes, Cancel Order'}
        loading={cancelling}
        autoClose={false}
        onConfirm={handleCancelOrder}
      />
    </div>
  );
}
