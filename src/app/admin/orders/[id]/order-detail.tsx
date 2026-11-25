'use client';

import * as React from 'react';
import Link from 'next/link';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import type { OrderStatus } from '@/types/platform';
import { Panel } from '@components/dashboard/panel';
import { Icon } from '@components/icon/icon';
import { InvoiceActions, InvoiceSheet } from '@components/platform/invoice';
import { Money } from '@components/platform/money';
import { NotFoundState } from '@components/platform/not-found-state';
import { OrderTimeline } from '@components/platform/order-timeline';
import { StatusPill } from '@components/platform/status-pill';
import { UserAvatar } from '@components/platform/user-avatar';
import { Callout, PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { Select } from '@components/ui/select';
import { Textarea } from '@components/ui/textarea';
import { ORDER_TRANSITIONS, orderMoney } from '@lib/business/orders';
import { toast } from '@lib/toast';

export function AdminOrderDetail({ id }: { id: string }) {
  const { t, dateTime, tx, num } = useI18n();
  const { orders, sellers, settings, updateOrderStatus } = usePlatformStore();
  const order = orders.find((o) => o.id === id);
  const [next, setNext] = React.useState<string>('');
  const [note, setNote] = React.useState('');
  const [invoiceOpen, setInvoiceOpen] = React.useState(false);

  if (!order) return <NotFoundState title={t('common.noResults')} backHref="/admin/orders" />;
  const seller = sellers.find((s) => s.id === order.sellerId);
  const m = orderMoney(order);
  const options = ORDER_TRANSITIONS[order.status];
  const c = order.customer;

  const apply = () => {
    if (!next) return;
    const res = updateOrderStatus(order.id, next as OrderStatus, note || undefined);
    if (res.ok) {
      toast.success(t('admin.orders.statusUpdated'), {
        description: t(`status.order.${next as OrderStatus}`),
      });
      setNext('');
      setNote('');
    } else toast.error(t('common.somethingWrong'));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('seller.orders.detailTitle', { id: order.id })}
        description={dateTime(order.createdAt)}
        backHref="/admin/orders"
        backLabel={t('nav.allOrders')}

        actions={
          <>
            <StatusPill kind="order" value={order.status} className="h-8 px-3" />
            <Button variant="secondary" onClick={() => setInvoiceOpen(true)}>
              <Icon name="receipt" size={16} />
              {t('admin.orders.invoicePreview')}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Panel title={t('common.product')}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/products/${order.productId}`}
                  className="text-ink hover:text-accent font-semibold"
                >
                  {order.productName}
                </Link>
                <p className="text-muted num mt-1 text-[14px]">
                  {num(order.quantity)} × <Money value={order.sellingPrice} />
                </p>
              </div>
              <Money value={m.subtotal} className="text-ink text-xl font-extrabold" />
            </div>
          </Panel>

          <div className="grid gap-5 md:grid-cols-2">
            <Panel title={t('seller.orders.customerInfo')}>
              <p className="text-ink font-semibold">{c.name}</p>
              <p className="num text-muted mt-1 text-[14px]">
                {c.phone}
                {c.altPhone ? ` · ${c.altPhone}` : ''}
              </p>
              <p className="text-muted mt-2 text-[14px]">
                {c.address}, {c.upazila}, {c.district}
              </p>
              <span className="bg-well text-muted mt-3 inline-flex rounded-full px-2.5 py-1 text-[12.5px] font-semibold">
                {tx(`area.${c.area}`)}
              </span>
              {order.note && (
                <Callout tone="neutral" compact className="mt-3" description={order.note} />
              )}
            </Panel>
            <Panel title={t('admin.orders.sellerInfo')}>
              {seller && (
                <Link
                  href={`/admin/sellers/${seller.id}`}
                  className="hover:bg-well -mx-2 flex items-center gap-3 rounded-lg p-2"
                >
                  <UserAvatar name={seller.name} color={seller.avatarColor} size={40} />
                  <div className="min-w-0">
                    <p className="text-ink truncate font-semibold">{seller.name}</p>
                    <p className="text-muted truncate text-[14px]">{seller.shopName}</p>
                  </div>
                </Link>
              )}
              <dl className="border-line mt-3 space-y-1 border-t pt-3 text-[14px]">
                <div className="flex justify-between">
                  <dt className="text-muted">{t('seller.orders.courier')}</dt>
                  <dd className="text-ink font-medium">{order.courier ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">{t('seller.orders.trackingCode')}</dt>
                  <dd className="text-ink font-mono text-xs">{order.trackingCode ?? '—'}</dd>
                </div>
              </dl>
            </Panel>
          </div>

          <Panel title={t('admin.orders.tracking')}>
            <OrderTimeline order={order} />
          </Panel>
        </div>

        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <Panel title={t('admin.orders.updateStatus')}>
            {options.length === 0 ? (
              <Callout tone="neutral" compact description={t('admin.orders.noTransitions')} />
            ) : (
              <div className="space-y-3">
                <Select
                  value={next}
                  onValueChange={setNext}
                  placeholder={t('admin.orders.newStatus')}
                  items={options.map((s) => ({ value: s, label: t(`status.order.${s}`) }))}
                  aria-label={t('admin.orders.newStatus')}
                />
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('admin.orders.statusNote')}
                  rows={2}
                />
                {next === 'delivered' && (
                  <Callout
                    tone="info"
                    compact
                    description={t('admin.orders.deliveredHint', {
                      hours: settings.earningsReleaseHours,
                    })}
                  />
                )}
                {next === 'cancelled' && (
                  <Callout tone="warn" compact description={t('admin.orders.cancelHint')} />
                )}
                <Button variant="primary" className="w-full" disabled={!next} onClick={apply}>
                  <Icon name="check" size={16} />
                  {t('admin.orders.updateStatus')}
                </Button>
              </div>
            )}
          </Panel>
          <Panel title={t('admin.orders.financials')}>
            <Fin label={t('admin.orders.orderAmount')} value={m.codAmount} strong />
            <div className="bg-well/60 my-2 rounded-xl px-3 py-1.5">
              <Fin
                label={t('admin.orders.supplierCost')}
                value={m.supplierTotal}
                tone="text-muted font-semibold"
              />
              <Fin
                label={t('admin.orders.platformProfit')}
                value={m.platformProfit}
                tone="font-semibold text-[var(--status-ok-fg)]"
              />
              <Fin
                label={t('admin.orders.sellerProfit')}
                value={m.sellerProfit}
                tone="font-semibold text-[var(--color-sun-600)] dark:text-[var(--color-sun-300)]"
              />
            </div>
            <Fin label={t('admin.orders.charges')} value={m.charges} />
            <p className="text-subtle text-[12.5px]">
              {t('invoice.deliveryCharge')} <Money value={order.deliveryCharge} /> ·{' '}
              {t('invoice.packagingCharge')} <Money value={order.packagingCharge} />
            </p>
          </Panel>
        </div>
      </div>

      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('admin.orders.invoicePreview')}</DialogTitle>
          </DialogHeader>
          <DialogBody className="bg-well/50 space-y-4">
            <InvoiceActions order={order} seller={seller} platformName={settings.platformName} />
            <InvoiceSheet order={order} seller={seller} platformName={settings.platformName} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Fin = ({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: number;
  tone?: string;
  strong?: boolean;
}) => (
  <div className="flex items-center justify-between py-1.5 text-[14px]">
    <span className="text-muted">{label}</span>
    <Money
      value={value}
      className={tone ?? (strong ? 'text-ink text-base font-bold' : 'text-ink font-semibold')}
    />
  </div>
);
