'use client';

import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';

import { useI18n } from '@/i18n/provider';
import type { Order } from '@/types/platform';
import { ListToolbar } from '@components/dashboard/list-toolbar';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { StatusPill } from '@components/platform/status-pill';
import { PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { type Column, DataTable } from '@components/ui/data-table';
import { useListState } from '@hooks/use-list-state';
import { orderMoney } from '@lib/business/orders';

import { useSellerRecords } from '../components/use-seller-data';

export default function InvoicesPage() {
  const { t, date } = useI18n();
  const router = useRouter();
  const { orders } = useSellerRecords();
  const list = useListState({
    rows: orders,
    search: (o) => [o.invoiceNo, o.id, o.customer.name, o.productName],
  });

  const columns: Column<Order>[] = [
    {
      key: 'inv',
      header: t('seller.invoices.invoiceNo'),
      cell: (o) => (
        <span className="text-ink font-mono text-[12.5px] font-semibold">{o.invoiceNo}</span>
      ),
    },
    {
      key: 'order',
      header: t('common.orderId'),
      cell: (o) => <span className="text-accent font-medium">{o.id}</span>,
    },
    {
      key: 'date',
      header: t('invoice.invoiceDate'),
      cell: (o) => <span className="num text-muted text-[13px]">{date(o.createdAt)}</span>,
    },
    {
      key: 'customer',
      header: t('common.customer'),
      cell: (o) => <span className="text-[13px]">{o.customer.name}</span>,
    },
    {
      key: 'product',
      header: t('common.product'),
      wrap: true,
      minWidth: 180,
      cell: (o) => <span className="text-muted line-clamp-1 text-[13px]">{o.productName}</span>,
    },
    {
      key: 'total',
      header: t('common.total'),
      align: 'right',
      cell: (o) => <Money value={orderMoney(o).codAmount} className="text-ink font-semibold" />,
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (o) => <StatusPill kind="order" value={o.status} />,
    },
    {
      key: 'view',
      align: 'right',
      cell: (o) => (
        <Button variant="ghost" size="sm" asChild onClick={(e) => e.stopPropagation()}>
          <Link href={`/seller/invoices/${o.id}`}>
            <Icon name="eye" size={15} />
            {t('common.view')}
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t('seller.invoices.title')} description={t('seller.invoices.subtitle')} />
      <ListToolbar
        query={list.query}
        onQuery={list.setQuery}
        placeholder={t('common.searchPlaceholder')}
      />
      <DataTable
        columns={columns}
        source={list.pageRows}
        rowKey="id"
        onRowClick={(o) => router.push(`/seller/invoices/${o.id}`)}
        page={list.page}
        limit={list.limit}
        total={list.total}
        onPaginate={list.setPage}
        empty={{ title: t('seller.orders.empty') }}
      />
    </div>
  );
}
