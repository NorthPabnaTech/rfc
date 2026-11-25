'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';

import { useI18n } from '@/i18n/provider';
import { ListToolbar } from '@components/dashboard/list-toolbar';
import { Money } from '@components/platform/money';
import { StatusPill } from '@components/platform/status-pill';
import { PageHeader } from '@components/shared';
import { type Column, DataTable } from '@components/ui/data-table';
import { Select } from '@components/ui/select';
import type { WalletTransaction } from '@lib/api/reseller';

import { useSellerTransactions } from '../../components/use-seller-data';

const TX_TYPES = [
  'deposit',
  'withdrawal',
  'order_deduction',
  'order_profit',
  'order_refund',
  'admin_adjustment',
] as const;

const TX_STATUSES = ['pending', 'completed', 'rejected', 'failed'] as const;

export default function SellerTransactionsPage() {
  return (
    <React.Suspense>
      <TransactionsContent />
    </React.Suspense>
  );
}

function TransactionsContent() {
  const { t, dateTime } = useI18n();
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type');
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [type, setType] = React.useState(
    initialType && (TX_TYPES as readonly string[]).includes(initialType) ? initialType : 'all',
  );
  const [status, setStatus] = React.useState('all');
  const [query, setQuery] = React.useState('');

  const { items, total, loading } = useSellerTransactions({ page, limit, type, status });

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (x) =>
        x.txNumber.toLowerCase().includes(q) ||
        (x.note ?? '').toLowerCase().includes(q) ||
        (x.orderNumber ?? '').toLowerCase().includes(q),
    );
  }, [items, query]);

  const columns: Column<WalletTransaction>[] = [
    {
      key: 'txNumber',
      header: t('common.id'),
      cell: (x) => <span className="text-muted font-mono text-xs">{x.txNumber}</span>,
    },
    {
      key: 'date',
      header: t('common.date'),
      cell: (x) => <span className="num text-muted text-[13px]">{dateTime(x.createdAt)}</span>,
    },
    {
      key: 'type',
      header: t('common.type'),
      cell: (x) => (
        <span className="text-[13px] font-medium capitalize">{x.type.replace(/_/g, ' ')}</span>
      ),
    },
    {
      key: 'note',
      header: t('common.description'),
      cell: (x) => (
        <span className="text-muted text-[13px]">{x.note || x.orderNumber || '—'}</span>
      ),
    },
    {
      key: 'amount',
      header: t('common.amount'),
      align: 'right',
      cell: (x) => {
        const signed = x.direction === 'debit' ? -x.amount : x.amount;
        return (
          <Money
            value={signed}
            signed
            className={
              x.direction === 'credit'
                ? 'font-bold text-[var(--status-ok-fg)]'
                : 'font-bold text-[var(--status-danger-fg)]'
            }
          />
        );
      },
    },
    {
      key: 'balanceAfter',
      header: t('seller.wallet.newBalance'),
      align: 'right',
      cell: (x) => <Money value={x.balanceAfter} className="text-ink font-semibold" />,
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (x) => <StatusPill kind="tx" value={x.status === 'rejected' ? 'failed' : x.status} />,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t('seller.wallet.txTitle')} description={t('seller.wallet.txSubtitle')} />
      <ListToolbar
        query={query}
        onQuery={setQuery}
        placeholder={t('common.searchPlaceholder')}
      >
        <Select
          size="md"
          className="sm:w-48"
          value={type}
          onValueChange={(v) => {
            setType(v);
            setPage(1);
          }}
          items={[
            { value: 'all', label: t('seller.wallet.allTypes') },
            ...TX_TYPES.map((x) => ({
              value: x,
              label: x.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            })),
          ]}
          aria-label={t('common.type')}
        />
        <Select
          size="md"
          className="sm:w-40"
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          items={[
            { value: 'all', label: t('common.all') },
            ...TX_STATUSES.map((s) => ({
              value: s,
              label: s.charAt(0).toUpperCase() + s.slice(1),
            })),
          ]}
          aria-label={t('common.status')}
        />
      </ListToolbar>
      <DataTable
        columns={columns}
        source={filtered}
        rowKey="id"
        isLoading={loading}
        page={page}
        limit={limit}
        total={total}
        onPaginate={setPage}
        pageSizeOptions={[15, 20, 50]}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
        empty={{ title: t('common.noResults') }}
      />
    </div>
  );
}
