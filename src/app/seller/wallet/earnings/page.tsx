'use client';

import * as React from 'react';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore, useWallet } from '@/stores/platform-store';
import { KpiCard, Panel } from '@components/dashboard/panel';
import { Icon } from '@components/icon/icon';
import { earningColumns } from '@components/platform/columns';
import { Money } from '@components/platform/money';
import { PageHeader } from '@components/shared';
import { DataTable } from '@components/ui/data-table';
import { Tabs } from '@components/ui/tabs';
import { useNow } from '@hooks/use-now';

import { useSellerRecords } from '../../components/use-seller-data';

export default function SellerEarningsPage() {
  const i18n = useI18n();
  const now = useNow();
  const { t, money, num, duration } = i18n;
  const { seller, earnings } = useSellerRecords();
  const wallet = useWallet(seller?.id);
  const hours = usePlatformStore((s) => s.settings.earningsReleaseHours);
  const [tab, setTab] = React.useState<'all' | 'pending' | 'released'>('all');
  const [page, setPage] = React.useState(1);
  const pending = earnings
    .filter((e) => e.status === 'pending')
    .sort((a, b) => a.releaseAt.localeCompare(b.releaseAt));
  const released = earnings.filter((e) => e.status === 'released');
  const rows = tab === 'all' ? earnings : tab === 'pending' ? pending : released;
  const next = pending[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('seller.wallet.earningsTitle')}
        description={t('seller.wallet.earningsSubtitle', { hours })}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label={t('seller.wallet.pendingEarnings')}
          value={money(wallet.pending)}
          icon="clock"
          tone="warn"
          hint={`${num(pending.length)} ${t('common.order')}`}
        />
        <KpiCard
          label={t('seller.wallet.releasedEarnings')}
          value={money(released.reduce((a, e) => a + e.amount, 0))}
          icon="checkCircle"
          tone="ok"
          hint={`${num(released.length)} ${t('common.order')}`}
        />
        <KpiCard
          label={t('seller.wallet.available')}
          value={money(wallet.available)}
          icon="wallet"
          tone="brand"
        />
      </div>

      <Panel title={t('seller.wallet.releaseFlow')}>
        <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
          {[
            {
              icon: 'delivered' as const,
              label: t('status.order.delivered'),
              tone: 'bg-brand-soft text-brand-ink',
            },
            {
              icon: 'clock' as const,
              label: t('seller.wallet.pendingHint', { hours }),
              tone: 'bg-[var(--status-warn-bg)] text-[var(--status-warn-fg)]',
            },
            {
              icon: 'wallet' as const,
              label: t('seller.wallet.available'),
              tone: 'bg-[var(--status-ok-bg)] text-[var(--status-ok-fg)]',
            },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              <div className="bg-well/50 flex items-center gap-3 rounded-xl p-3">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${s.tone}`}>
                  <Icon name={s.icon} size={19} />
                </span>
                <span className="text-ink text-[13px] font-semibold">{s.label}</span>
              </div>
              {i < 2 && (
                <Icon
                  name="chevRight"
                  size={20}
                  className="text-brand-300 mx-auto hidden sm:block"
                />
              )}
            </React.Fragment>
          ))}
        </div>
        {next && (
          <p className="text-muted mt-4 text-[13px]">
            {t('seller.wallet.expectedRelease')}:{' '}
            <Money value={next.amount} className="text-ink font-bold" /> · {next.orderId} ·{' '}
            <span className="num font-semibold text-[var(--status-warn-fg)]">
              {t('seller.wallet.releasesIn', {
                time: duration(Math.max(0, new Date(next.releaseAt).getTime() - now)),
              })}
            </span>
          </p>
        )}
      </Panel>

      <Tabs
        variant="line"
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          setPage(1);
        }}
        items={[
          { value: 'all', label: t('common.all') },
          { value: 'pending', label: `${t('status.earning.pending')} (${num(pending.length)})` },
          { value: 'released', label: t('status.earning.released') },
        ]}
      />
      <DataTable
        columns={earningColumns(i18n, { base: '/seller' })}
        source={rows.slice((page - 1) * 10, page * 10)}
        rowKey="id"
        page={page}
        limit={10}
        total={rows.length}
        onPaginate={setPage}
        empty={{ title: t('seller.dashboard.noPending') }}
      />
    </div>
  );
}
