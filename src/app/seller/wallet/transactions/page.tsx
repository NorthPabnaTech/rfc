'use client';

import * as React from 'react';

import { useI18n } from '@/i18n/provider';
import { ListToolbar } from '@components/dashboard/list-toolbar';
import { RangeFilter, type RangeValue } from '@components/dashboard/range-filter';
import { transactionColumns } from '@components/platform/columns';
import { Money } from '@components/platform/money';
import { PageHeader } from '@components/shared';
import { DataTable } from '@components/ui/data-table';
import { Select } from '@components/ui/select';
import { useListState } from '@hooks/use-list-state';
import { inRange, resolveRange } from '@lib/business/analytics';
import { TX_TYPES } from '@lib/business/wallet';

import { useSellerRecords } from '../../components/use-seller-data';

export default function SellerTransactionsPage() {
  const i18n = useI18n();
  const { t } = i18n;
  const { transactions } = useSellerRecords();
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
    search: (x) => [x.id, x.description],
    filters: {
      type: (x, v) => x.type === v,
      direction: (x, v) => (v === 'credit' ? x.amount > 0 : x.amount < 0),
    },
    initialFilters: { type: 'all', direction: 'all' },
    pageSize: 15,
  });
  const credits = list.filtered
    .filter((x) => x.amount > 0 && x.status === 'completed')
    .reduce((a, x) => a + x.amount, 0);
  const debits = list.filtered
    .filter((x) => x.amount < 0 && x.status !== 'failed')
    .reduce((a, x) => a + x.amount, 0);

  return (
    <div className="space-y-5">
      <PageHeader title={t('seller.wallet.txTitle')} description={t('seller.wallet.txSubtitle')} />
      <ListToolbar
        query={list.query}
        onQuery={list.setQuery}
        placeholder={t('common.searchPlaceholder')}
        end={
          <span className="text-muted text-xs whitespace-nowrap">
            {t('seller.wallet.credit')}{' '}
            <Money value={credits} signed className="font-bold text-[var(--status-ok-fg)]" /> ·{' '}
            {t('seller.wallet.debit')}{' '}
            <Money value={debits} className="font-bold text-[var(--status-danger-fg)]" />
          </span>
        }
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
          className="sm:w-36"
          value={list.filters.direction}
          onValueChange={(v) => list.setFilter('direction', v)}
          items={[
            { value: 'all', label: t('common.all') },
            { value: 'credit', label: t('seller.wallet.credit') },
            { value: 'debit', label: t('seller.wallet.debit') },
          ]}
          aria-label={t('common.type')}
        />
        <RangeFilter value={range} onChange={setRange} />
      </ListToolbar>
      <DataTable
        columns={transactionColumns(i18n)}
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
