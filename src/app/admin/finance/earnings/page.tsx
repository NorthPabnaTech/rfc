'use client';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import { ListToolbar } from '@components/dashboard/list-toolbar';
import { KpiCard } from '@components/dashboard/panel';
import { earningColumns } from '@components/platform/columns';
import { PageHeader } from '@components/shared';
import { DataTable } from '@components/ui/data-table';
import { Select } from '@components/ui/select';
import { useListState } from '@hooks/use-list-state';

export default function AdminEarningsPage() {
  const i18n = useI18n();
  const { t, money, num } = i18n;
  const { earnings, sellers, settings } = usePlatformStore();
  const list = useListState({
    rows: earnings,
    search: (e) => [e.orderId, sellers.find((s) => s.id === e.sellerId)?.name],
    filters: { status: (e, v) => e.status === v, seller: (e, v) => e.sellerId === v },
    initialFilters: { status: 'all', seller: 'all' },
    sorters: { newest: (a, b) => b.deliveredAt.localeCompare(a.deliveredAt) },
    initialSort: 'newest',
  });
  const pending = earnings.filter((e) => e.status === 'pending');
  const released = earnings.filter((e) => e.status === 'released');
  const sum = (l: typeof earnings) => l.reduce((a, e) => a + e.amount, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('admin.finance.earningsTitle')}
        description={t('admin.finance.earningsSubtitle')}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label={t('seller.wallet.totalEarnings')}
          value={money(sum(earnings))}
          icon="moneyBag"
          tone="brand"
          hint={num(earnings.length)}
        />
        <KpiCard
          label={t('seller.wallet.pendingEarnings')}
          value={money(sum(pending))}
          icon="clock"
          tone="warn"
          hint={t('seller.wallet.pendingHint', { hours: settings.earningsReleaseHours })}
        />
        <KpiCard
          label={t('seller.wallet.releasedEarnings')}
          value={money(sum(released))}
          icon="checkCircle"
          tone="ok"
        />
      </div>
      <ListToolbar
        query={list.query}
        onQuery={list.setQuery}
        placeholder={t('common.searchPlaceholder')}
      >
        <Select
          size="md"
          className="sm:w-40"
          value={list.filters.status}
          onValueChange={(v) => list.setFilter('status', v)}
          items={[
            { value: 'all', label: t('seller.orders.allStatuses') },
            { value: 'pending', label: t('status.earning.pending') },
            { value: 'released', label: t('status.earning.released') },
          ]}
          aria-label={t('common.status')}
        />
        <Select
          size="md"
          className="sm:w-48"
          showSearch
          value={list.filters.seller}
          onValueChange={(v) => list.setFilter('seller', v)}
          items={[
            { value: 'all', label: t('nav.allSellers') },
            ...sellers.map((s) => ({ value: s.id, label: s.name })),
          ]}
          aria-label={t('common.seller')}
        />
      </ListToolbar>
      <DataTable
        columns={earningColumns(i18n, { base: '/admin', sellers, showSeller: true })}
        source={list.pageRows}
        rowKey="id"
        page={list.page}
        limit={list.limit}
        total={list.total}
        onPaginate={list.setPage}
        empty={{ title: t('common.noResults') }}
      />
    </div>
  );
}
