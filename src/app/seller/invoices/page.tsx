'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';

import { useI18n } from '@/i18n/provider';
import { ListToolbar } from '@components/dashboard/list-toolbar';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { StatusPill } from '@components/platform/status-pill';
import { PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { type Column, DataTable } from '@components/ui/data-table';
import type { ResellerOrder } from '@lib/api/reseller';

import { useSellerOrders } from '../components/use-seller-data';

export default function InvoicesPage() {
  const { t, date } = useI18n();
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const [query, setQuery] = React.useState('');
  const { orders, total, loading } = useSellerOrders({ page, limit: 20 });

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        (o.customer?.name ?? '').toLowerCase().includes(q) ||
        (o.customer?.phone ?? '').toLowerCase().includes(q),
    );
  }, [orders, query]);

  const columns: Column<ResellerOrder>[] = [
    {
      key: 'orderNumber',
      header: t('common.orderId'),
      cell: (o) => <span className="text-accent font-mono text-xs font-semibold">{o.orderNumber}</span>,
    },
    {
      key: 'date',
      header: t('invoice.invoiceDate'),
      cell: (o) => <span className="num text-muted text-[13px]">{date(o.createdAt)}</span>,
    },
    {
      key: 'customer',
      header: t('common.customer'),
      cell: (o) => <span className="text-[13px]">{o.customer?.name || '—'}</span>,
    },
    {
      key: 'total',
      header: t('common.total'),
      align: 'right',
      cell: (o) => <Money value={o.total} className="text-ink font-semibold" />,
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
        query={query}
        onQuery={setQuery}
        placeholder={t('common.searchPlaceholder')}
      />
      <DataTable
        columns={columns}
        source={filtered}
        rowKey="id"
        isLoading={loading}
        page={page}
        limit={20}
        total={total}
        onPaginate={setPage}
        onRowClick={(o) => router.push(`/seller/invoices/${o.id}`)}
        empty={{ title: t('common.noResults') }}
      />
    </div>
  );
}
