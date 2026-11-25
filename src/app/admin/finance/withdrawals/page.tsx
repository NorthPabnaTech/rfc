'use client';

import * as React from 'react';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import type { Withdrawal, WithdrawalStatus } from '@/types/platform';
import { ListToolbar } from '@components/dashboard/list-toolbar';
import { KpiCard } from '@components/dashboard/panel';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { StatusPill } from '@components/platform/status-pill';
import { UserAvatar } from '@components/platform/user-avatar';
import { PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { type Column, DataTable } from '@components/ui/data-table';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { Tabs } from '@components/ui/tabs';
import { Textarea } from '@components/ui/textarea';
import { useListState } from '@hooks/use-list-state';
import { toast } from '@lib/toast';

export default function WithdrawalsPage() {
  const { t, dateTime, num, money } = useI18n();
  const { withdrawals, sellers, setWithdrawalStatus } = usePlatformStore();
  const [tab, setTab] = React.useState<'all' | WithdrawalStatus>('pending');
  const [rejecting, setRejecting] = React.useState<Withdrawal | null>(null);
  const [reason, setReason] = React.useState('');

  const list = useListState({
    rows: tab === 'all' ? withdrawals : withdrawals.filter((w) => w.status === tab),
    search: (w) => [w.id, w.account, sellers.find((s) => s.id === w.sellerId)?.name],
  });

  const act = (w: Withdrawal, status: WithdrawalStatus, note?: string) => {
    const res = setWithdrawalStatus(w.id, status, note);
    if (res.ok)
      toast.success(t('admin.finance.updated'), {
        description: `${w.id} · ${t(`status.withdrawal.${status}`)}`,
      });
    else toast.error(t('common.somethingWrong'));
  };

  const count = (s: WithdrawalStatus) => withdrawals.filter((w) => w.status === s).length;
  const columns: Column<Withdrawal>[] = [
    {
      key: 'id',
      header: t('common.id'),
      cell: (w) => <span className="text-muted font-mono text-xs">{w.id}</span>,
    },
    {
      key: 'seller',
      header: t('common.seller'),
      cell: (w) => {
        const s = sellers.find((x) => x.id === w.sellerId);
        return (
          <span className="flex items-center gap-2">
            <UserAvatar name={s?.name ?? '?'} color={s?.avatarColor} size={28} />
            <span className="text-[14px] font-medium">{s?.name}</span>
          </span>
        );
      },
    },
    {
      key: 'date',
      header: t('common.date'),
      cell: (w) => <span className="num text-muted text-[14px]">{dateTime(w.requestedAt)}</span>,
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
      cell: (w) => <Money value={w.amount} className="text-ink font-semibold" />,
    },
    {
      key: 'fee',
      header: t('seller.wallet.withdrawFee'),
      align: 'right',
      cell: (w) => <Money value={w.fee} className="text-muted" />,
    },
    {
      key: 'net',
      header: t('seller.wallet.netAmount'),
      align: 'right',
      cell: (w) => (
        <Money value={w.amount - w.fee} className="font-bold text-[var(--status-ok-fg)]" />
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (w) => <StatusPill kind="withdrawal" value={w.status} />,
    },
    {
      key: 'actions',
      align: 'right',
      cell: (w) =>
        w.status === 'pending' ? (
          <span className="flex justify-end gap-1.5">
            <Button size="sm" variant="primary" onClick={() => act(w, 'approved')}>
              {t('admin.finance.approve')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-[var(--status-danger-fg)]"
              onClick={() => setRejecting(w)}
            >
              {t('admin.finance.reject')}
            </Button>
          </span>
        ) : w.status === 'approved' ? (
          <span className="flex justify-end gap-1.5">
            <Button size="sm" variant="primary" onClick={() => act(w, 'completed')}>
              <Icon name="check" size={14} />
              {t('admin.finance.complete')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-[var(--status-danger-fg)]"
              onClick={() => setRejecting(w)}
            >
              {t('admin.finance.reject')}
            </Button>
          </span>
        ) : (
          <span className="text-subtle text-xs" title={w.note}>
            {w.processedAt ? dateTime(w.processedAt) : ''}
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('admin.finance.withdrawalsTitle')}
        description={t('admin.finance.withdrawalsSubtitle')}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label={t('status.withdrawal.pending')}
          value={money(
            withdrawals.filter((w) => w.status === 'pending').reduce((a, w) => a + w.amount, 0),
          )}
          icon="clock"
          tone="warn"
          hint={num(count('pending'))}
        />
        <KpiCard
          label={t('status.withdrawal.approved')}
          value={num(count('approved'))}
          icon="badgeCheck"
          tone="info"
        />
        <KpiCard
          label={t('status.withdrawal.completed')}
          value={num(count('completed'))}
          icon="checkCircle"
          tone="ok"
        />
        <KpiCard
          label={t('status.withdrawal.rejected')}
          value={num(count('rejected'))}
          icon="cancelCircle"
          tone="danger"
        />
      </div>
      <Tabs
        variant="line"
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          list.setPage(1);
        }}
        items={(['pending', 'approved', 'completed', 'rejected', 'all'] as const).map((s) => ({
          value: s,
          label: s === 'all' ? t('common.all') : t(`status.withdrawal.${s}`),
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
        empty={{ title: t('common.noResults') }}
      />

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('admin.finance.reject')} · {rejecting?.id}
            </DialogTitle>
            <DialogDescription>{rejecting ? money(rejecting.amount) : ''}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <label className="type-label text-ink">{t('admin.finance.rejectReason')}</label>
            <Textarea
              className="mt-1.5"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (rejecting) act(rejecting, 'rejected', reason || undefined);
                setRejecting(null);
                setReason('');
              }}
            >
              {t('admin.finance.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
