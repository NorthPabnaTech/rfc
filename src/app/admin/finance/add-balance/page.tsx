'use client';

import * as React from 'react';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore, useWallet } from '@/stores/platform-store';
import type { Deposit, PaymentMethod } from '@/types/platform';
import { Panel } from '@components/dashboard/panel';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { StatusPill } from '@components/platform/status-pill';
import { PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { type Column, DataTable } from '@components/ui/data-table';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Select } from '@components/ui/select';
import { toast } from '@lib/toast';

const METHODS: PaymentMethod[] = ['bkash', 'nagad', 'rocket', 'bank'];

export default function AdminAddBalancePage() {
  const { t, dateTime, money } = useI18n();
  const { deposits, sellers, settings, addBalance } = usePlatformStore();
  const [sellerId, setSellerId] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [method, setMethod] = React.useState<PaymentMethod>('bkash');
  const [reference, setReference] = React.useState('');
  const [page, setPage] = React.useState(1);
  const wallet = useWallet(sellerId);
  const value = Number(amount) || 0;
  const tooLow = value > 0 && value < settings.minAddBalance;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerId || value < settings.minAddBalance) return;
    const res = addBalance(sellerId, value, method, reference || 'ADMIN-MANUAL');
    if (res.ok) {
      toast.success(t('admin.finance.creditDone'), {
        description: `${money(value)} → ${sellers.find((s) => s.id === sellerId)?.name}`,
      });
      setAmount('');
      setReference('');
    }
  };

  const columns: Column<Deposit>[] = [
    {
      key: 'id',
      header: t('common.id'),
      cell: (d) => <span className="text-muted font-mono text-xs">{d.id}</span>,
    },
    {
      key: 'date',
      header: t('common.date'),
      cell: (d) => <span className="num text-muted text-[14px]">{dateTime(d.createdAt)}</span>,
    },
    {
      key: 'seller',
      header: t('common.seller'),
      cell: (d) => (
        <span className="text-[14px]">{sellers.find((s) => s.id === d.sellerId)?.name}</span>
      ),
    },
    {
      key: 'method',
      header: t('common.method'),
      cell: (d) => <span className="text-[14px]">{t(`payment.${d.method}`)}</span>,
    },
    {
      key: 'ref',
      header: t('common.reference'),
      cell: (d) => <span className="font-mono text-xs">{d.reference}</span>,
    },
    {
      key: 'amount',
      header: t('common.amount'),
      align: 'right',
      cell: (d) => (
        <Money value={d.amount} className="font-semibold text-[var(--status-ok-fg)]" signed />
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (d) => <StatusPill kind="deposit" value={d.status} />,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('admin.finance.addBalanceTitle')}
        description={t('admin.finance.addBalanceSubtitle')}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Panel
          title={t('admin.finance.manualCredit')}
          description={t('admin.finance.manualCreditDesc')}
          className="lg:self-start"
        >
          <form onSubmit={submit} className="flex flex-col gap-y-5">
            <div className="flex flex-col gap-1.5">
              <Label className="type-label">{t('common.seller')}</Label>
              <Select
                value={sellerId}
                onValueChange={setSellerId}
                showSearch
                placeholder={t('common.selectPlaceholder')}
                items={sellers
                  .filter((s) => s.status !== 'pending')
                  .map((s) => ({ value: s.id, label: `${s.name} · ${s.shopName}` }))}
              />
              {sellerId && (
                <p className="type-helper text-muted">
                  {t('seller.wallet.available')}:{' '}
                  <Money value={wallet.available} className="text-ink font-semibold" />
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="type-label">{t('common.amount')}</Label>
              <Input
                type="number"
                min={settings.minAddBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500"
                className="h-10 text-sm"
                aria-invalid={tooLow || undefined}
              />
              <p
                className={
                  tooLow ? 'type-helper text-[var(--status-danger-fg)]' : 'type-helper text-muted'
                }
              >
                {t('seller.wallet.minAdd', { amount: money(settings.minAddBalance) })}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="type-label">{t('common.method')}</Label>
              <Select
                value={method}
                onValueChange={(v) => setMethod(v as PaymentMethod)}
                items={METHODS.map((m) => ({ value: m, label: t(`payment.${m}`) }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="type-label">{t('common.reference')}</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="TX…"
                className="h-10 text-sm"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={!sellerId || value < settings.minAddBalance}
            >
              <Icon name="moneyAdd" size={16} />
              {t('admin.finance.manualCredit')}
            </Button>
          </form>
        </Panel>
        <DataTable
          title={t('admin.finance.deposits')}
          columns={columns}
          source={deposits.slice((page - 1) * 10, page * 10)}
          rowKey="id"
          page={page}
          limit={10}
          total={deposits.length}
          onPaginate={setPage}
        />
      </div>
    </div>
  );
}
