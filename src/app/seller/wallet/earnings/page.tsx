'use client';

import * as React from 'react';

import { useI18n } from '@/i18n/provider';
import { KpiCard, Panel } from '@components/dashboard/panel';
import { Money } from '@components/platform/money';
import { StatusPill } from '@components/platform/status-pill';
import { PageHeader } from '@components/shared';
import { type Column, DataTable } from '@components/ui/data-table';
import type { WalletTransaction } from '@lib/api/reseller';

import { useSellerTransactions, useSellerWallet } from '../../components/use-seller-data';

export default function SellerEarningsPage() {
  const { t, money, num, dateTime } = useI18n();
  const { wallet } = useSellerWallet();
  const [page, setPage] = React.useState(1);
  const { items, total, loading } = useSellerTransactions({
    page,
    limit: 20,
    type: 'order_profit',
  });

  const columns: Column<WalletTransaction>[] = [
    {
      key: 'txNumber',
      header: t('common.id'),
      cell: (x) => <span className="text-muted font-mono text-xs">{x.txNumber}</span>,
    },
    {
      key: 'orderNumber',
      header: t('common.orderId'),
      cell: (x) => <span className="font-mono text-xs font-semibold">{x.orderNumber || '—'}</span>,
    },
    {
      key: 'date',
      header: t('common.date'),
      cell: (x) => <span className="num text-muted text-[13px]">{dateTime(x.createdAt)}</span>,
    },
    {
      key: 'amount',
      header: t('seller.orders.profit'),
      align: 'right',
      cell: (x) => (
        <Money value={x.amount} signed className="font-bold text-[var(--status-ok-fg)]" />
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (x) => <StatusPill kind="tx" value={x.status === 'rejected' ? 'failed' : x.status} />,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('seller.wallet.earningsTitle')}
        description="Profit credited automatically when orders are delivered."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label={t('seller.dashboard.totalEarnings')}
          value={money(wallet.totalProfitEarned)}
          icon="moneyBag"
          tone="ok"
          hint={`${num(total)} ${t('common.order')}`}
          href="/seller/wallet/transactions?type=order_profit"
        />
        <KpiCard
          label={t('seller.wallet.available')}
          value={money(wallet.walletBalance)}
          icon="wallet"
          tone="brand"
          href="/seller/wallet/transactions"
        />
        <KpiCard
          label={t('nav.withdraw')}
          value={money(wallet.totalWithdrawn)}
          icon="moneySend"
          tone="warn"
          href="/seller/wallet/transactions?type=withdrawal"
        />
      </div>

      <Panel title={t('seller.wallet.earningsTitle')} flush>
        <DataTable
          columns={columns}
          source={items}
          rowKey="id"
          isLoading={loading}
          page={page}
          limit={20}
          total={total}
          onPaginate={setPage}
          classNames={{ root: 'rounded-none border-x-0 border-b-0' }}
          empty={{ title: t('common.noResults') }}
        />
      </Panel>
    </div>
  );
}
