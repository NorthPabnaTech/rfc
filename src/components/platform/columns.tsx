'use client';

import Link from 'next/link';

import type { I18n } from '@/i18n/provider';
import type { Order, Seller, Transaction, TransactionType } from '@/types/platform';
import { Icon, type IconRegistryKey } from '@components/icon/icon';
import type { Column } from '@components/ui/data-table';
import { orderMoney } from '@lib/business/orders';
import { cn } from '@lib/utils';

import { Money } from './money';
import { StatusPill } from './status-pill';
import { UserAvatar } from './user-avatar';

/*
 * Column factories shared by admin and seller tables, so an order or a
 * transaction looks the same everywhere. Pass the i18n object from useI18n().
 */

export const TX_ICON: Record<TransactionType, IconRegistryKey> = {
  add_balance: 'moneyAdd',
  delivery_charge: 'shipping',
  packaging_charge: 'packageOpen',
  seller_earning: 'moneyBag',
  withdrawal: 'moneySend',
  withdrawal_fee: 'receipt',
  refund: 'refresh',
};

export function TxTypeCell({ type, i18n }: { type: TransactionType; i18n: I18n }) {
  const credit = type === 'add_balance' || type === 'seller_earning' || type === 'refund';
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-lg',
          credit ? 'bg-[var(--status-ok-bg)] text-[var(--status-ok-fg)]' : 'bg-well text-muted',
        )}
      >
        <Icon name={TX_ICON[type]} size={16} />
      </span>
      <span className="text-ink text-[14px] font-medium">{i18n.tx(`txType.${type}`)}</span>
    </span>
  );
}

export function orderColumns(
  i18n: I18n,
  opts: {
    base: '/admin' | '/seller';
    sellers?: Seller[];
    showSeller?: boolean;
    showInvoice?: boolean;
  },
): Column<Order>[] {
  const { t, date, num } = i18n;
  const cols: Column<Order>[] = [
    {
      key: 'id',
      header: t('common.orderId'),
      cell: (o) => (
        <Link
          href={`${opts.base}/orders/${o.id}`}
          className="text-accent font-semibold hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {o.id}
        </Link>
      ),
    },
    {
      key: 'product',
      header: t('common.product'),
      wrap: true,
      minWidth: 180,
      cell: (o) => (
        <span className="text-ink line-clamp-2 text-[14px] font-medium">{o.productName}</span>
      ),
    },
  ];
  if (opts.showSeller) {
    cols.push({
      key: 'seller',
      header: t('common.seller'),
      cell: (o) => {
        const s = opts.sellers?.find((x) => x.id === o.sellerId);
        return (
          <span className="flex items-center gap-2">
            <UserAvatar name={s?.name ?? '?'} color={s?.avatarColor} size={26} />
            <span className="text-ink text-[14px]">{s?.name ?? o.sellerId}</span>
          </span>
        );
      },
    });
  }
  cols.push(
    {
      key: 'customer',
      header: t('common.customer'),
      cell: (o) => (
        <span className="leading-tight">
          <span className="text-ink block text-[14px]">{o.customer.name}</span>
          <span className="text-subtle num block text-[12.5px]">{o.customer.phone}</span>
        </span>
      ),
    },
    {
      key: 'date',
      header: t('seller.orders.orderDate'),
      cell: (o) => <span className="num text-muted text-[14px]">{date(o.createdAt)}</span>,
    },
    {
      key: 'qty',
      header: t('common.qty'),
      align: 'center',
      cell: (o) => <span className="num">{num(o.quantity)}</span>,
    },
    {
      key: 'amount',
      header:
        opts.base === '/admin' ? t('admin.orders.orderAmount') : t('seller.orders.sellingPrice'),
      align: 'right',
      cell: (o) => (
        <Money
          value={opts.base === '/admin' ? orderMoney(o).codAmount : o.sellingPrice}
          className="text-ink font-semibold"
        />
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (o) => <StatusPill kind="order" value={o.status} />,
    },
  );
  if (opts.showInvoice) {
    cols.push({
      key: 'invoice',
      header: t('seller.orders.invoice'),
      align: 'center',
      cell: (o) => (
        <Link
          href={`${opts.base}/invoices/${o.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-muted hover:text-accent inline-grid size-8 place-items-center rounded-md hover:bg-[var(--color-well)]"
          aria-label={t('seller.orders.invoice')}
        >
          <Icon name="receipt" size={17} />
        </Link>
      ),
    });
  }
  return cols;
}

export function transactionColumns(
  i18n: I18n,
  opts: { sellers?: Seller[]; showSeller?: boolean } = {},
): Column<Transaction>[] {
  const { t, dateTime } = i18n;
  const cols: Column<Transaction>[] = [
    {
      key: 'id',
      header: t('common.id'),
      cell: (x) => <span className="text-muted font-mono text-[12px]">{x.id}</span>,
    },
    {
      key: 'date',
      header: t('common.date'),
      cell: (x) => <span className="num text-muted text-[14px]">{dateTime(x.createdAt)}</span>,
    },
    {
      key: 'type',
      header: t('common.type'),
      cell: (x) => <TxTypeCell type={x.type} i18n={i18n} />,
    },
  ];
  if (opts.showSeller) {
    cols.push({
      key: 'seller',
      header: t('common.seller'),
      cell: (x) => (
        <span className="text-ink text-[14px]">
          {opts.sellers?.find((s) => s.id === x.sellerId)?.name ?? x.sellerId}
        </span>
      ),
    });
  }
  cols.push(
    {
      key: 'amount',
      header: t('common.amount'),
      align: 'right',
      cell: (x) => <Money value={x.amount} signed tone="auto" className="font-semibold" />,
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (x) => <StatusPill kind="tx" value={x.status} />,
    },
    {
      key: 'desc',
      header: t('common.description'),
      wrap: true,
      minWidth: 200,
      cell: (x) => <span className="text-muted text-[13px]">{x.description}</span>,
    },
  );
  return cols;
}

export function earningColumns(
  i18n: I18n,
  opts: { base: '/admin' | '/seller'; sellers?: Seller[]; showSeller?: boolean },
): Column<import('@/types/platform').Earning>[] {
  const { t, dateTime, duration } = i18n;
  const cols: Column<import('@/types/platform').Earning>[] = [
    {
      key: 'order',
      header: t('common.orderId'),
      cell: (e) => (
        <Link
          href={`${opts.base}/orders/${e.orderId}`}
          className="text-accent font-semibold hover:underline"
        >
          {e.orderId}
        </Link>
      ),
    },
  ];
  if (opts.showSeller) {
    cols.push({
      key: 'seller',
      header: t('common.seller'),
      cell: (e) => (
        <span className="text-[14px]">{opts.sellers?.find((s) => s.id === e.sellerId)?.name}</span>
      ),
    });
  }
  cols.push(
    {
      key: 'delivered',
      header: t('seller.wallet.deliveredAt'),
      cell: (e) => <span className="num text-muted text-[14px]">{dateTime(e.deliveredAt)}</span>,
    },
    {
      key: 'release',
      header: t('seller.wallet.expectedRelease'),
      cell: (e) => {
        const left = new Date(e.releaseAt).getTime() - Date.now();
        return (
          <span className="leading-tight">
            <span className="num text-ink block text-[14px]">{dateTime(e.releaseAt)}</span>
            {e.status === 'pending' && left > 0 && (
              <span className="num block text-[12.5px] text-[var(--status-warn-fg)]">
                {t('seller.wallet.releasesIn', { time: duration(left) })}
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: 'amount',
      header: t('common.amount'),
      align: 'right',
      cell: (e) => <Money value={e.amount} className="text-ink font-semibold" />,
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (e) => <StatusPill kind="earning" value={e.status} />,
    },
  );
  return cols;
}
