'use client';

import * as React from 'react';
import { useRouter } from 'nextjs-toploader/app';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore, useWallet } from '@/stores/platform-store';
import type { Withdrawal } from '@/types/platform';
import { BarSeries } from '@components/charts/charts';
import { useChartFormat } from '@components/charts/use-chart-format';
import { KpiCard, KpiGrid, Panel } from '@components/dashboard/panel';
import { Icon } from '@components/icon/icon';
import { earningColumns, orderColumns, transactionColumns } from '@components/platform/columns';
import { Money } from '@components/platform/money';
import { NotFoundState } from '@components/platform/not-found-state';
import { StatusPill } from '@components/platform/status-pill';
import { UserAvatar } from '@components/platform/user-avatar';
import { WalletSummary } from '@components/platform/wallet-summary';
import { PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { type Column, DataTable } from '@components/ui/data-table';
import { Tabs } from '@components/ui/tabs';
import { monthlySeries } from '@lib/business/analytics';

import {
  type SellerAction,
  SellerStatusConfirm,
  useSellerActions,
} from '../components/seller-actions';

export function SellerDetail({ id }: { id: string }) {
  const i18n = useI18n();
  const { t, num, date } = i18n;
  const fmt = useChartFormat();
  const router = useRouter();
  const s = usePlatformStore();
  const seller = s.sellers.find((x) => x.id === id);
  const wallet = useWallet(id);
  const actionsFor = useSellerActions();
  const [pending, setPending] = React.useState<{
    seller: NonNullable<typeof seller>;
    action: SellerAction;
  } | null>(null);
  const orders = React.useMemo(() => s.orders.filter((o) => o.sellerId === id), [s.orders, id]);
  const txs = React.useMemo(
    () => s.transactions.filter((x) => x.sellerId === id),
    [s.transactions, id],
  );
  const earnings = React.useMemo(
    () => s.earnings.filter((x) => x.sellerId === id),
    [s.earnings, id],
  );
  const withdrawals = React.useMemo(
    () => s.withdrawals.filter((x) => x.sellerId === id),
    [s.withdrawals, id],
  );
  const [tab, setTab] = React.useState('overview');
  const [page, setPage] = React.useState(1);

  if (!seller) return <NotFoundState title={t('common.noResults')} backHref="/admin/sellers" />;

  const months = monthlySeries(s, 6, new Date(), id);
  const delivered = orders.filter((o) => o.status === 'delivered').length;
  const paged = <T,>(rows: T[]) => rows.slice((page - 1) * 10, page * 10);

  const wCols: Column<Withdrawal>[] = [
    {
      key: 'id',
      header: t('common.id'),
      cell: (w) => <span className="font-mono text-xs">{w.id}</span>,
    },
    {
      key: 'date',
      header: t('common.date'),
      cell: (w) => <span className="num text-muted text-[14px]">{date(w.requestedAt)}</span>,
    },
    {
      key: 'method',
      header: t('common.method'),
      cell: (w) => (
        <span className="text-[14px]">
          {t(`payment.${w.method}`)} · <span className="num">{w.account}</span>
        </span>
      ),
    },
    {
      key: 'amount',
      header: t('common.amount'),
      align: 'right',
      cell: (w) => <Money value={w.amount} className="font-semibold" />,
    },
    {
      key: 'fee',
      header: t('seller.wallet.withdrawFee'),
      align: 'right',
      cell: (w) => <Money value={w.fee} className="text-muted" />,
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (w) => <StatusPill kind="withdrawal" value={w.status} />,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={seller.name}
        description={seller.shopName}
        backHref="/admin/sellers"
        backLabel={t('admin.sellers.title')}
        leading={<UserAvatar name={seller.name} color={seller.avatarColor} size={52} />}

        actions={
          <>
            <StatusPill kind="seller" value={seller.status} className="h-8 px-3" />
            {actionsFor(seller).map((a) => (
              <Button
                key={a.status}
                variant={a.destructive ? 'outline' : 'primary'}
                className={a.destructive ? 'text-[var(--status-danger-fg)]' : undefined}
                onClick={() => setPending({ seller, action: a })}
              >
                <Icon name={a.icon} size={16} />
                {a.label}
              </Button>
            ))}
          </>
        }
      />

      <Tabs
        variant="line"
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          setPage(1);
        }}
        items={(
          ['overview', 'orders', 'wallet', 'transactions', 'earnings', 'profile'] as const
        ).map((k) => ({ value: k, label: t(`admin.sellers.tabs.${k}`) }))}
      />

      {tab === 'overview' && (
        <div className="space-y-5">
          <KpiGrid>
            <KpiCard
              label={t('admin.sellers.totalOrders')}
              value={num(orders.length)}
              icon="cart"
              tone="brand"
            />
            <KpiCard
              label={t('seller.dashboard.deliveredOrders')}
              value={num(delivered)}
              icon="delivered"
              tone="ok"
            />
            <KpiCard
              label={t('seller.wallet.available')}
              value={<Money value={wallet.available} />}
              icon="wallet"
              tone="navy"
            />
            <KpiCard
              label={t('seller.wallet.totalEarnings')}
              value={<Money value={wallet.totalEarnings} />}
              icon="moneyBag"
              tone="sun"
            />
          </KpiGrid>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Panel
              title={t('seller.dashboard.earningsOverview')}
              description={t('seller.dashboard.earningsOverviewDesc')}
            >
              <BarSeries
                data={months}
                xKey="key"
                series={[{ key: 'sellerProfit', label: t('admin.analysis.sellerProfit') }]}
                format={fmt.money}
                tickFormat={fmt.moneyTick}
                xTickFormat={fmt.monthLabel}
                height={240}
              />
            </Panel>
            <Panel title={t('seller.dashboard.recentOrders')} flush>
              <DataTable
                columns={orderColumns(i18n, { base: '/admin' }).filter((c) =>
                  ['id', 'product', 'amount', 'status'].includes(c.key),
                )}
                source={orders.slice(0, 5)}
                rowKey="id"
                onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
                classNames={{ root: 'rounded-none border-x-0 border-b-0' }}
                empty={{ title: t('seller.orders.empty') }}
              />
            </Panel>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <DataTable
          columns={orderColumns(i18n, { base: '/admin' })}
          source={paged(orders)}
          rowKey="id"
          onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
          page={page}
          limit={10}
          total={orders.length}
          onPaginate={setPage}
          empty={{ title: t('seller.orders.empty') }}
        />
      )}

      {tab === 'wallet' && (
        <div className="space-y-5">
          <WalletSummary wallet={wallet} />
          <DataTable
            title={t('seller.wallet.history')}
            columns={wCols}
            source={withdrawals}
            rowKey="id"
            empty={{ title: t('common.noResults') }}
          />
        </div>
      )}

      {tab === 'transactions' && (
        <DataTable
          columns={transactionColumns(i18n)}
          source={paged(txs)}
          rowKey="id"
          page={page}
          limit={10}
          total={txs.length}
          onPaginate={setPage}
        />
      )}

      {tab === 'earnings' && (
        <DataTable
          columns={earningColumns(i18n, { base: '/admin' })}
          source={paged(earnings)}
          rowKey="id"
          page={page}
          limit={10}
          total={earnings.length}
          onPaginate={setPage}
          empty={{ title: t('common.noResults') }}
        />
      )}

      {tab === 'profile' && (
        <Panel title={t('seller.profile.personal')}>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            {[
              [t('common.name'), seller.name],
              [t('admin.sellers.shop'), seller.shopName],
              [t('common.email'), seller.email],
              [t('common.phone'), seller.phone],
              [t('auth.district'), seller.district],
              [t('common.address'), seller.address],
              [t('seller.profile.payoutMethod'), t(`payment.${seller.payout.method}`)],
              [t('seller.profile.payoutAccount'), seller.payout.account],
              [t('admin.sellers.registered'), date(seller.joinedAt)],
              [t('admin.sellers.lastOrder'), orders[0] ? date(orders[0].createdAt) : '—'],
            ].map(([k, v]) => (
              <div
                key={k}
                className="border-line flex justify-between gap-4 border-b py-3 text-[14px]"
              >
                <dt className="text-muted">{k}</dt>
                <dd className="text-ink num text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      )}

      <SellerStatusConfirm pending={pending} onClose={() => setPending(null)} />
    </div>
  );
}
