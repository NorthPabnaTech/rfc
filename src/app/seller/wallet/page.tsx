'use client';

import Link from 'next/link';

import { useI18n } from '@/i18n/provider';
import { KpiCard, Panel } from '@components/dashboard/panel';
import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { StatusPill } from '@components/platform/status-pill';
import { PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { type Column, DataTable } from '@components/ui/data-table';
import type { WalletTransaction } from '@lib/api/reseller';

import { useSellerTransactions, useSellerWallet } from '../components/use-seller-data';

export default function WalletOverviewPage() {
  const { t, money, dateTime } = useI18n();
  const { wallet } = useSellerWallet();
  const { items: transactions, loading } = useSellerTransactions({ page: 1, limit: 8 });

  const steps: [IconRegistryKey, string, string][] = [
    [
      'moneyAdd',
      t('site.walletFlow.w1'),
      t('site.walletFlow.w1d', { min: money(wallet.minDeposit) }),
    ],
    ['receipt', t('site.walletFlow.w2'), t('site.walletFlow.w2d')],
    ['clock', t('site.walletFlow.w3'), t('site.walletFlow.w3d')],
    [
      'moneySend',
      t('site.walletFlow.w4'),
      `Minimum withdrawal ${money(wallet.minWithdrawal)}.`,
    ],
  ];

  const columns: Column<WalletTransaction>[] = [
    {
      key: 'txNumber',
      header: t('common.id'),
      cell: (x) => <span className="font-mono text-xs text-muted">{x.txNumber}</span>,
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
      cell: (x) => <span className="text-muted text-[13px]">{x.note || x.orderNumber || '—'}</span>,
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
      key: 'status',
      header: t('common.status'),
      cell: (x) => <StatusPill kind="tx" value={x.status === 'rejected' ? 'failed' : x.status} />,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('seller.wallet.title')}
        description={t('seller.wallet.subtitle')}
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href="/seller/wallet/withdraw">
                <Icon name="moneySend" size={16} />
                {t('nav.withdraw')}
              </Link>
            </Button>
            <Button variant="primary" asChild>
              <Link href="/seller/wallet/add-balance">
                <Icon name="moneyAdd" size={16} />
                {t('nav.addBalance')}
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          label={t('seller.dashboard.available')}
          value={money(wallet.walletBalance)}
          icon="wallet"
          tone="brand"
          href="/seller/wallet/transactions"
        />
        <KpiCard
          label={t('seller.dashboard.totalEarnings')}
          value={money(wallet.totalProfitEarned)}
          icon="moneyBag"
          tone="ok"
          href="/seller/wallet/transactions?type=order_profit"
        />
        <KpiCard
          label={t('nav.addBalance')}
          value={money(wallet.totalDeposited)}
          icon="moneyAdd"
          tone="info"
          href="/seller/wallet/transactions?type=deposit"
        />
        <KpiCard
          label={t('nav.withdraw')}
          value={money(wallet.totalWithdrawn)}
          icon="moneySend"
          tone="warn"
          href="/seller/wallet/transactions?type=withdrawal"
        />
      </div>

      <Panel title={t('seller.wallet.howItWorks')}>
        <ol className="grid gap-3 md:grid-cols-4">
          {steps.map(([icon, title, desc], i) => (
            <li key={title} className="bg-well/50 relative rounded-xl p-4">
              <span className="bg-brand-soft text-brand-ink grid size-9 place-items-center rounded-lg">
                <Icon name={icon} size={18} />
              </span>
              <p className="text-ink mt-3 text-[13.5px] font-bold">{title}</p>
              <p className="text-muted mt-1 text-xs leading-relaxed">{desc}</p>
              {i < steps.length - 1 && (
                <Icon
                  name="chevRight"
                  size={18}
                  className="text-brand-300 absolute top-1/2 -right-3 z-10 hidden -translate-y-1/2 md:block"
                />
              )}
            </li>
          ))}
        </ol>
      </Panel>

      <Panel
        title={t('seller.wallet.recent')}
        href="/seller/wallet/transactions"
        hrefLabel={t('common.viewAll')}
        flush
      >
        <DataTable
          columns={columns}
          source={transactions}
          rowKey="id"
          isLoading={loading}
          classNames={{ root: 'rounded-none border-x-0 border-b-0' }}
          empty={{ title: t('common.noResults') }}
        />
      </Panel>
    </div>
  );
}
