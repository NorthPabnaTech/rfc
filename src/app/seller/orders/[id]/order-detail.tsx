'use client';

import Link from 'next/link';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import { Panel } from '@components/dashboard/panel';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { NotFoundState } from '@components/platform/not-found-state';
import { OrderTimeline } from '@components/platform/order-timeline';
import { StatusPill } from '@components/platform/status-pill';
import { Callout, PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { useNow } from '@hooks/use-now';
import { orderMoney } from '@lib/business/orders';

import { useSellerRecords } from '../../components/use-seller-data';

export function SellerOrderDetail({ id }: { id: string }) {
  const { t, dateTime, tx, num, duration } = useI18n();
  const now = useNow();
  const { orders, earnings } = useSellerRecords();
  const hours = usePlatformStore((s) => s.settings.earningsReleaseHours);
  const order = orders.find((o) => o.id === id);
  if (!order)
    return <NotFoundState title={t('seller.orders.notFound')} backHref="/seller/orders" />;
  const m = orderMoney(order);
  const c = order.customer;
  const earning = earnings.find((e) => e.orderId === order.id);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('seller.orders.detailTitle', { id: order.id })}
        description={dateTime(order.createdAt)}
        backHref="/seller/orders"
        backLabel={t('nav.myOrders')}

        actions={
          <>
            <StatusPill kind="order" value={order.status} className="h-8 px-3" />
            <Button variant="secondary" asChild>
              <Link href={`/seller/invoices/${order.id}`}>
                <Icon name="receipt" size={16} />
                {t('seller.order.viewInvoice')}
              </Link>
            </Button>
          </>
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
            <OrderTimeline order={order} />
          </Panel>
          <Panel title={t('seller.orders.customerInfo')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-ink font-semibold">{c.name}</p>
                <p className="num text-muted mt-1 text-[13px]">
                  {c.phone}
                  {c.altPhone ? ` · ${c.altPhone}` : ''}
                </p>
              </div>
              <div>
                <p className="text-muted text-[13px]">
                  {c.address}, {c.upazila}, {c.district}
                </p>
                <span className="bg-well text-muted mt-2 inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-semibold">
                  {tx(`area.${c.area}`)}
                </span>
              </div>
            </div>
            {order.note && (
              <Callout tone="neutral" compact className="mt-4" description={order.note} />
            )}
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel title={t('common.product')}>
            <Link
              href={`/seller/products/${order.productId}`}
              className="text-ink hover:text-accent font-semibold"
            >
              {order.productName}
            </Link>
            <p className="text-muted num mt-1 text-[13px]">
              {num(order.quantity)} × <Money value={order.sellingPrice} />
            </p>
            <div className="border-line mt-3 border-t pt-2">
              <Row label={t('seller.order.codAmount')} value={m.codAmount} strong />
              <Row
                label={t('invoice.deliveryCharge')}
                value={order.deliveryCharge}
                tone="text-muted"
              />
              <Row
                label={t('invoice.packagingCharge')}
                value={order.packagingCharge}
                tone="text-muted"
              />
            </div>
          </Panel>
          <Panel title={t('seller.orders.profit')}>
            <Money
              value={
                order.status === 'cancelled' || order.status === 'returned' ? 0 : m.sellerProfit
              }
              className="block text-3xl font-extrabold text-[var(--status-ok-fg)]"
            />
            {earning ? (
              <div className="mt-2 flex items-center gap-2">
                <StatusPill kind="earning" value={earning.status} />
                {earning.status === 'pending' && (
                  <span className="num text-xs text-[var(--status-warn-fg)]">
                    {t('seller.wallet.releasesIn', {
                      time: duration(Math.max(0, new Date(earning.releaseAt).getTime() - now)),
                    })}
                  </span>
                )}
              </div>
            ) : (
              order.status !== 'cancelled' &&
              order.status !== 'returned' && (
                <p className="text-muted mt-1 text-xs">
                  {t('seller.orders.profitPending', { hours })}
                </p>
              )
            )}
          </Panel>
          <Panel title={t('admin.orders.tracking')}>
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">{t('seller.orders.courier')}</dt>
                <dd className="text-ink font-medium">{order.courier ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">{t('seller.orders.trackingCode')}</dt>
                <dd className="text-ink font-mono text-xs">{order.trackingCode ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">{t('seller.invoices.invoiceNo')}</dt>
                <dd className="text-ink font-mono text-xs">{order.invoiceNo}</dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}

const Row = ({
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
  <div className="flex items-center justify-between py-1.5 text-[13px]">
    <span className="text-muted">{label}</span>
    <Money
      value={value}
      className={tone ?? (strong ? 'text-ink text-base font-bold' : 'text-ink font-semibold')}
    />
  </div>
);
