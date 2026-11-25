'use client';

import * as React from 'react';
import { useRouter } from 'nextjs-toploader/app';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import type { Seller } from '@/types/platform';
import { ListToolbar } from '@components/dashboard/list-toolbar';
import { KpiCard, KpiGrid } from '@components/dashboard/panel';
import { Money } from '@components/platform/money';
import { StatusPill } from '@components/platform/status-pill';
import { UserAvatar } from '@components/platform/user-avatar';
import { PageHeader } from '@components/shared';
import { type Column, DataTable } from '@components/ui/data-table';
import { useListState } from '@hooks/use-list-state';
import { computeWallet, type WalletSummary } from '@lib/business/wallet';

type Row = Seller & WalletSummary;

export default function WalletsPage() {
  const { t, money } = useI18n();
  const router = useRouter();
  const { sellers, transactions, earnings, withdrawals } = usePlatformStore();
  const rows = React.useMemo<Row[]>(
    () =>
      sellers
        .filter((s) => s.status !== 'pending')
        .map((s) => ({ ...s, ...computeWallet(s.id, transactions, earnings, withdrawals) })),
    [sellers, transactions, earnings, withdrawals],
  );
  const sum = (k: keyof WalletSummary) => rows.reduce((a, r) => a + r[k], 0);
  const list = useListState({
    rows,
    search: (r) => [r.name, r.shopName, r.phone],
    sorters: { available: (a, b) => b.available - a.available },
    initialSort: 'available',
  });

  const columns: Column<Row>[] = [
    {
      key: 'seller',
      header: t('common.seller'),
      cell: (r) => (
        <span className="flex items-center gap-3">
          <UserAvatar name={r.name} color={r.avatarColor} size={32} />
          <span className="leading-tight">
            <span className="text-ink block text-[14px] font-semibold">{r.name}</span>
            <span className="text-subtle block text-[12.5px]">{r.shopName}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'available',
      header: t('seller.wallet.available'),
      align: 'right',
      cell: (r) => <Money value={r.available} className="text-ink font-bold" />,
    },
    {
      key: 'pending',
      header: t('seller.wallet.pending'),
      align: 'right',
      cell: (r) => <Money value={r.pending} className="text-[var(--status-warn-fg)]" />,
    },
    {
      key: 'earnings',
      header: t('seller.wallet.totalEarnings'),
      align: 'right',
      cell: (r) => <Money value={r.totalEarnings} />,
    },
    {
      key: 'withdrawn',
      header: t('seller.wallet.totalWithdrawn'),
      align: 'right',
      cell: (r) => <Money value={r.totalWithdrawn} />,
    },
    {
      key: 'charges',
      header: t('seller.wallet.totalCharges'),
      align: 'right',
      cell: (r) => <Money value={r.totalCharges} className="text-muted" />,
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (r) => <StatusPill kind="seller" value={r.status} />,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('admin.finance.walletsTitle')}
        description={t('admin.finance.walletsSubtitle')}
      />
      <KpiGrid>
        <KpiCard
          label={t('admin.finance.totalAvailable')}
          value={money(sum('available'))}
          icon="wallet"
          tone="brand"
        />
        <KpiCard
          label={t('admin.finance.totalPending')}
          value={money(sum('pending'))}
          icon="clock"
          tone="warn"
        />
        <KpiCard
          label={t('admin.finance.totalEarnings')}
          value={money(sum('totalEarnings'))}
          icon="moneyBag"
          tone="ok"
        />
        <KpiCard
          label={t('admin.finance.totalWithdrawals')}
          value={money(sum('totalWithdrawn'))}
          icon="moneySend"
          tone="sun"
        />
      </KpiGrid>
      <ListToolbar
        query={list.query}
        onQuery={list.setQuery}
        placeholder={t('admin.sellers.searchPlaceholder')}
      />
      <DataTable
        columns={columns}
        source={list.pageRows}
        rowKey="id"
        onRowClick={(r) => router.push(`/admin/sellers/${r.id}`)}
        page={list.page}
        limit={list.limit}
        total={list.total}
        onPaginate={list.setPage}
      />
    </div>
  );
}
