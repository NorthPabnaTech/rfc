'use client';

import * as React from 'react';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import { ListToolbar } from '@components/dashboard/list-toolbar';
import { RangeFilter, type RangeValue } from '@components/dashboard/range-filter';
import { transactionColumns } from '@components/platform/columns';
import { PageHeader } from '@components/shared';
import { DataTable } from '@components/ui/data-table';
import { Select } from '@components/ui/select';
import { useListState } from '@hooks/use-list-state';
import { inRange, resolveRange } from '@lib/business/analytics';
import { TX_TYPES } from '@lib/business/wallet';

export default function AdminTransactionsPage() {
  const i18n = useI18n();
  const { t } = i18n;
  const { transactions, sellers } = usePlatformStore();
  const [range, setRange] = React.useState<RangeValue>({ key: 'all' });
  const r = resolveRange(range.key, range.custom);
  const rows = React.useMemo(
    () =>
      range.key === 'all' ? transactions : transactions.filter((x) => inRange(x.createdAt, r)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, range],
  );
  const list = useListState({
    rows,
    search: (x) => [x.id, x.description, sellers.find((s) => s.id === x.sellerId)?.name],
    filters: {
      type: (x, v) => x.type === v,
      status: (x, v) => x.status === v,
      seller: (x, v) => x.sellerId === v,
    },
    initialFilters: { type: 'all', status: 'all', seller: 'all' },
    pageSize: 15,
  });

  return (
    <div className="space-y-5">
      <PageHeader title={t('admin.finance.txTitle')} description={t('admin.finance.txSubtitle')} />
      <ListToolbar
        query={list.query}
        onQuery={list.setQuery}
        placeholder={t('common.searchPlaceholder')}
      >
        <Select
          size="md"
          className="sm:w-48"
          value={list.filters.type}
          onValueChange={(v) => list.setFilter('type', v)}
          items={[
            { value: 'all', label: t('seller.wallet.allTypes') },
            ...TX_TYPES.map((x) => ({ value: x, label: t(`txType.${x}`) })),
          ]}
          aria-label={t('common.type')}
        />
        <Select
          size="md"
          className="sm:w-40"
          value={list.filters.status}
          onValueChange={(v) => list.setFilter('status', v)}
          items={[
            { value: 'all', label: t('seller.orders.allStatuses') },
            ...(['completed', 'pending', 'failed'] as const).map((x) => ({
              value: x,
              label: t(`status.tx.${x}`),
            })),
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
        <RangeFilter value={range} onChange={setRange} />
      </ListToolbar>
      <DataTable
        columns={transactionColumns(i18n, { sellers, showSeller: true })}
        source={list.pageRows}
        rowKey="id"
        page={list.page}
        limit={list.limit}
        total={list.total}
        onPaginate={list.setPage}
        pageSizeOptions={[15, 30, 50]}
        onLimitChange={list.setLimit}
        empty={{ title: t('common.noResults') }}
      />
    </div>
  );
}
