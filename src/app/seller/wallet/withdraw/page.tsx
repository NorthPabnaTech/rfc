'use client';

import * as React from 'react';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore, useWallet } from '@/stores/platform-store';
import type { PaymentMethod, Withdrawal } from '@/types/platform';
import { Panel } from '@components/dashboard/panel';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { StatusPill } from '@components/platform/status-pill';
import { ConfirmDialog, PageHeader } from '@components/shared';
import { CurrencyInput } from '@components/shared/numeric-format-input';
import { Button } from '@components/ui/button';
import { type Column, DataTable } from '@components/ui/data-table';
import { Input } from '@components/ui/input';
import { quoteWithdrawal, withdrawalFee } from '@lib/business/wallet';
import { toast } from '@lib/toast';
import { cn } from '@lib/utils';

import { useSellerRecords } from '../../components/use-seller-data';
import { MethodPicker } from '../components/method-picker';

export default function WithdrawPage() {
  const { t, money, dateTime } = useI18n();
  const { seller, withdrawals } = useSellerRecords();
  const wallet = useWallet(seller?.id);
  const settings = usePlatformStore((s) => s.settings);
  const request = usePlatformStore((s) => s.requestWithdrawal);
  const [amount, setAmount] = React.useState<number | undefined>();
  const [method, setMethod] = React.useState<PaymentMethod>(seller?.payout.method ?? 'bkash');
  const [account, setAccount] = React.useState(seller?.payout.account ?? '');
  const [confirm, setConfirm] = React.useState(false);
  const [touched, setTouched] = React.useState(false);
  const fees = settings.withdrawalFees;
  const q = quoteWithdrawal(amount ?? 0, wallet.available, settings);
  const accountError = account.trim().length < 6 ? t('common.required') : null;
  const amountError =
    q.error === 'below_min' || q.error === 'empty'
      ? t('seller.wallet.minWithdraw', { amount: money(settings.minWithdrawal) })
      : q.error === 'insufficient'
        ? t('seller.wallet.exceeds', { amount: money(wallet.available) })
        : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!amountError && !accountError) setConfirm(true);
  };

  const columns: Column<Withdrawal>[] = [
    {
      key: 'id',
      header: t('common.id'),
      cell: (w) => <span className="text-muted font-mono text-xs">{w.id}</span>,
    },
    {
      key: 'date',
      header: t('common.date'),
      cell: (w) => <span className="num text-muted text-[13px]">{dateTime(w.requestedAt)}</span>,
    },
    {
      key: 'method',
      header: t('common.method'),
      cell: (w) => (
        <span className="text-[13px]">
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
      key: 'net',
      header: t('seller.wallet.netAmount'),
      align: 'right',
      cell: (w) => (
        <Money value={w.amount - w.fee} className="font-semibold text-[var(--status-ok-fg)]" />
      ),
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
        title={t('seller.wallet.withdrawTitle')}
        description={t('seller.wallet.withdrawSubtitle')}
        backHref="/seller/wallet"
        backLabel={t('nav.walletOverview')}
      />
      <form onSubmit={submit} className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Panel
            title={t('seller.wallet.withdrawAmount')}
            action={
              <span className="text-muted text-xs">
                {t('seller.wallet.available')}:{' '}
                <Money value={wallet.available} className="text-ink font-bold" />
              </span>
            }
          >
            <div className="flex gap-2">
              <CurrencyInput
                value={amount}
                onValueChange={(v: number | undefined) => setAmount(v)}
                className="h-12 text-lg font-bold"
                containerClassName="flex-1"
                aria-invalid={(touched && !!amountError) || undefined}
                placeholder="0"
              />
              <Button
                type="button"
                variant="secondary"
                className="h-12"
                onClick={() => setAmount(Math.max(0, Math.floor(wallet.available)))}
              >
                MAX
              </Button>
            </div>
            <p
              className={cn(
                'type-helper mt-1.5',
                touched && amountError ? 'text-[var(--status-danger-fg)]' : 'text-muted',
              )}
            >
              {touched && amountError
                ? amountError
                : t('seller.wallet.minWithdraw', { amount: money(settings.minWithdrawal) })}
            </p>
            <div className="bg-well/60 mt-5 rounded-xl p-4">
              <p className="type-label text-ink mb-2">{t('seller.wallet.feeRules')}</p>
              <ul className="text-muted space-y-1 text-[13px]">
                <li>
                  •{' '}
                  {t('seller.wallet.feeLow', {
                    threshold: money(fees.threshold),
                    fee: money(fees.lowFee),
                  })}
                </li>
                <li>
                  •{' '}
                  {t('seller.wallet.feeHigh', {
                    threshold: money(fees.threshold),
                    fee: money(fees.highFee),
                  })}
                </li>
                <li>
                  •{' '}
                  {t('seller.wallet.feeAt', {
                    threshold: money(fees.threshold),
                    fee: money(fees.atThresholdFee),
                  })}
                </li>
              </ul>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[500, 1500].map((a) => (
                  <div key={a} className="bg-panel rounded-lg p-2.5 text-xs">
                    <Money value={a} className="font-semibold" /> −{' '}
                    <Money value={withdrawalFee(a, fees)} /> ={' '}
                    <Money
                      value={a - withdrawalFee(a, fees)}
                      className="font-bold text-[var(--status-ok-fg)]"
                    />
                  </div>
                ))}
              </div>
            </div>
          </Panel>
          <Panel title={t('seller.wallet.method')}>
            <MethodPicker value={method} onChange={setMethod} />
            <div className="mt-5 flex flex-col gap-1.5">
              <label htmlFor="account" className="type-label text-ink">
                {t('seller.wallet.accountNumber')} *
              </label>
              <Input
                id="account"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="num h-10 text-sm"
                aria-invalid={(touched && !!accountError) || undefined}
              />
              {touched && accountError && (
                <p className="type-helper text-[var(--status-danger-fg)]">{accountError}</p>
              )}
            </div>
          </Panel>
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Panel title={t('common.summary')}>
            <dl className="space-y-2.5 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">{t('seller.wallet.withdrawAmount')}</dt>
                <dd>
                  <Money value={q.amount} className="text-ink font-semibold" />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">{t('seller.wallet.withdrawFee')}</dt>
                <dd>
                  <Money value={-q.fee} className="font-semibold text-[var(--status-danger-fg)]" />
                </dd>
              </div>
              <div className="border-line flex justify-between border-t pt-2.5">
                <dt className="text-ink font-semibold">{t('seller.wallet.netAmount')}</dt>
                <dd>
                  <Money
                    value={q.net}
                    className="text-lg font-extrabold text-[var(--status-ok-fg)]"
                  />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">{t('common.method')}</dt>
                <dd className="font-medium">{t(`payment.${method}`)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">{t('seller.wallet.accountNumber')}</dt>
                <dd className="num font-medium">{account || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">{t('seller.order.balanceAfter')}</dt>
                <dd>
                  <Money value={wallet.available - q.amount} className="font-semibold" />
                </dd>
              </div>
            </dl>
            <Button type="submit" variant="primary" size="lg" className="mt-5 w-full">
              <Icon name="moneySend" size={17} />
              {t('seller.wallet.requestWithdraw')}
            </Button>
          </Panel>
        </div>
      </form>
      <DataTable
        title={t('seller.wallet.history')}
        columns={columns}
        source={withdrawals}
        rowKey="id"
        empty={{ title: t('common.noResults') }}
      />
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        tone="info"
        icon="moneySend"
        title={t('seller.wallet.confirmWithdraw')}
        description={`${t('seller.wallet.netAmount')}: ${money(q.net)}`}
        bullets={[
          { icon: 'coin', text: `${t('seller.wallet.withdrawAmount')}: ${money(q.amount)}` },
          { icon: 'receipt', text: `${t('seller.wallet.withdrawFee')}: ${money(q.fee)}` },
          { icon: 'wallet', text: `${t(`payment.${method}`)} · ${account}` },
        ]}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          if (!seller) return;
          const res = request(seller.id, q.amount, method, account);
          setConfirm(false);
          if (res.ok) {
            toast.success(t('seller.wallet.withdrawSuccess'), {
              description: t('seller.wallet.withdrawSuccessDesc', { net: money(q.net), account }),
            });
            setAmount(undefined);
            setTouched(false);
          } else toast.error(t('common.somethingWrong'));
        }}
      />
    </div>
  );
}
