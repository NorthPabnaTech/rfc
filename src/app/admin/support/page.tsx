'use client';

import * as React from 'react';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import type { SupportTicket, TicketStatus } from '@/types/platform';
import { ListToolbar } from '@components/dashboard/list-toolbar';
import { KpiCard } from '@components/dashboard/panel';
import { StatusPill } from '@components/platform/status-pill';
import { PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { type Column, DataTable } from '@components/ui/data-table';
import { Tabs } from '@components/ui/tabs';
import { useListState } from '@hooks/use-list-state';
import { toast } from '@lib/toast';

export default function SupportManagementPage() {
  const { t, relative, num } = useI18n();
  const { tickets, sellers, setTicketStatus } = usePlatformStore();
  const [tab, setTab] = React.useState<'all' | TicketStatus>('all');
  const list = useListState({
    rows: tab === 'all' ? tickets : tickets.filter((x) => x.status === tab),
    search: (x) => [x.id, x.subject, x.message, sellers.find((s) => s.id === x.sellerId)?.name],
  });
  const count = (s: TicketStatus) => tickets.filter((x) => x.status === s).length;
  const change = (x: SupportTicket, s: TicketStatus) => {
    setTicketStatus(x.id, s);
    toast.success(t('common.saved'), { description: `${x.id} · ${t(`status.ticket.${s}`)}` });
  };

  const columns: Column<SupportTicket>[] = [
    {
      key: 'id',
      header: t('common.id'),
      cell: (x) => <span className="text-muted font-mono text-xs">{x.id}</span>,
    },
    {
      key: 'subject',
      header: t('seller.support.subject'),
      wrap: true,
      minWidth: 260,
      cell: (x) => (
        <span>
          <span className="text-ink block text-[14px] font-semibold">{x.subject}</span>
          <span className="text-muted mt-0.5 line-clamp-2 block text-[13px]">{x.message}</span>
        </span>
      ),
    },
    {
      key: 'seller',
      header: t('common.seller'),
      cell: (x) => (
        <span className="text-[14px]">{sellers.find((s) => s.id === x.sellerId)?.name}</span>
      ),
    },
    {
      key: 'priority',
      header: t('seller.support.priority'),
      cell: (x) => <StatusPill kind="priority" value={x.priority} />,
    },
    {
      key: 'date',
      header: t('common.date'),
      cell: (x) => <span className="text-muted text-[14px]">{relative(x.createdAt)}</span>,
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (x) => <StatusPill kind="ticket" value={x.status} />,
    },
    {
      key: 'actions',
      align: 'right',
      cell: (x) =>
        x.status === 'open' ? (
          <Button size="sm" variant="secondary" onClick={() => change(x, 'in_progress')}>
            {t('admin.support.markInProgress')}
          </Button>
        ) : x.status === 'in_progress' ? (
          <Button size="sm" variant="primary" onClick={() => change(x, 'resolved')}>
            {t('admin.support.markResolved')}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => change(x, 'open')}>
            {t('admin.support.reopen')}
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t('admin.support.title')} description={t('admin.support.subtitle')} />
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          label={t('status.ticket.open')}
          value={num(count('open'))}
          icon="inbox"
          tone="warn"
        />
        <KpiCard
          label={t('status.ticket.in_progress')}
          value={num(count('in_progress'))}
          icon="processing"
          tone="info"
        />
        <KpiCard
          label={t('status.ticket.resolved')}
          value={num(count('resolved'))}
          icon="checkCircle"
          tone="ok"
        />
      </div>
      <Tabs
        variant="line"
        value={tab}
        onValueChange={setTab}
        items={(['all', 'open', 'in_progress', 'resolved'] as const).map((s) => ({
          value: s,
          label: s === 'all' ? t('common.all') : t(`status.ticket.${s}`),
        }))}
      />
      <ListToolbar
        query={list.query}
        onQuery={list.setQuery}
        placeholder={t('common.searchPlaceholder')}
      />
      <DataTable
        columns={columns}
        source={list.pageRows}
        rowKey="id"
        page={list.page}
        limit={list.limit}
        total={list.total}
        onPaginate={list.setPage}
        empty={{ title: t('seller.support.noTickets') }}
      />
    </div>
  );
}
