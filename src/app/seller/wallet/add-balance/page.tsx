'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { useI18n } from '@/i18n/provider';
import { useCurrentSeller, usePlatformStore, useWallet } from '@/stores/platform-store';
import type { PaymentMethod } from '@/types/platform';
import { Panel } from '@components/dashboard/panel';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { StatusPill } from '@components/platform/status-pill';
import { Callout, ConfirmDialog, PageHeader } from '@components/shared';
import { CurrencyInput } from '@components/shared/numeric-format-input';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { cn } from '@lib/utils';
import { BD_PHONE } from '@lib/validators/reseller';

import { MethodPicker } from '../components/method-picker';

const QUICK = [200, 500, 1000, 2000, 5000];

export default function AddBalancePage() {
  return (
    <React.Suspense>
      <AddBalance />
    </React.Suspense>
  );
}

function AddBalance() {
  const { t, money, dateTime } = useI18n();
  const params = useSearchParams();
  const seller = useCurrentSeller();
  const wallet = useWallet(seller?.id);
  const { settings, addBalance, deposits } = usePlatformStore();
  const [amount, setAmount] = React.useState<number | undefined>(
    Number(params.get('amount')) || undefined,
  );
  const [method, setMethod] = React.useState<PaymentMethod>('bkash');
  const [sender, setSender] = React.useState('');
  const [trx, setTrx] = React.useState('');
  const [touched, setTouched] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [done, setDone] = React.useState<{ id: string; amount: number } | null>(null);

  const value = amount ?? 0;
  const errors = {
    amount:
      value < settings.minAddBalance
        ? t('seller.wallet.minAdd', { amount: money(settings.minAddBalance) })
        : null,
    sender: method !== 'bank' && !BD_PHONE.test(sender) ? t('common.invalidPhone') : null,
    trx: trx.trim().length < 4 ? t('common.required') : null,
  };
  const valid = !errors.amount && !errors.sender && !errors.trx;
  const mine = deposits.filter((d) => d.sellerId === seller?.id).slice(0, 5);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (valid) setConfirm(true);
  };

  if (done) {
    return (
      <div className="mx-auto max-w-lg py-8 text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-[var(--status-ok-bg)] text-[var(--status-ok-fg)]">
          <Icon name="checkCircle" size={40} />
        </span>
        <h1 className="type-page-title text-ink mt-6">{t('seller.wallet.addSuccess')}</h1>
        <p className="type-body text-muted mt-2">
          {t('seller.wallet.addSuccessDesc', { amount: money(done.amount) })}
        </p>
        <div className="bg-panel border-line mt-6 space-y-2 rounded-2xl border p-4 text-left text-[13px]">
          <div className="flex justify-between">
            <span className="text-muted">{t('common.reference')}</span>
            <span className="font-mono text-xs">{done.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{t('common.method')}</span>
            <span className="font-medium">{t(`payment.${method}`)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{t('common.status')}</span>
            <StatusPill kind="deposit" value="completed" />
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{t('seller.wallet.newBalance')}</span>
            <Money value={wallet.available} className="text-ink font-bold" />
          </div>
        </div>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="primary" asChild>
            <Link href="/seller/orders/new">{t('nav.placeOrder')}</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/seller/wallet">{t('nav.walletOverview')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('seller.wallet.addTitle')}
        description={t('seller.wallet.addSubtitle')}
        backHref="/seller/wallet"
        backLabel={t('nav.walletOverview')}
      />
      <form onSubmit={submit} className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Panel title={t('seller.wallet.amount')}>
            <CurrencyInput
              value={amount}
              onValueChange={(v: number | undefined) => setAmount(v)}
              className="h-12 text-lg font-bold"
              aria-invalid={(touched && !!errors.amount) || undefined}
              placeholder="0"
            />
            <p
              className={cn(
                'type-helper mt-1.5',
                touched && errors.amount ? 'text-[var(--status-danger-fg)]' : 'text-muted',
              )}
            >
              {t('seller.wallet.minAdd', { amount: money(settings.minAddBalance) })}
            </p>
            <p className="type-label text-ink mt-5 mb-2">{t('seller.wallet.quickAmounts')}</p>
            <div className="flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(q)}
                  className={cn(
                    'focus-ring num h-9 rounded-full border px-4 text-[13px] font-semibold transition-colors',
                    amount === q
                      ? 'bg-brand border-brand text-white'
                      : 'border-line bg-panel text-ink hover:bg-well',
                  )}
                >
                  {money(q)}
                </button>
              ))}
            </div>
          </Panel>
          <Panel title={t('seller.wallet.method')}>
            <MethodPicker value={method} onChange={setMethod} />
            <div className="mt-5 grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
              {method !== 'bank' && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="sender" className="type-label text-ink">
                    {t('seller.wallet.senderNumber')} *
                  </label>
                  <Input
                    id="sender"
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    inputMode="tel"
                    className="h-10 text-sm"
                    aria-invalid={(touched && !!errors.sender) || undefined}
                  />
                  {touched && errors.sender && (
                    <p className="type-helper text-[var(--status-danger-fg)]">{errors.sender}</p>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="trx" className="type-label text-ink">
                  {t('seller.wallet.trxId')} *
                </label>
                <Input
                  id="trx"
                  value={trx}
                  onChange={(e) => setTrx(e.target.value.toUpperCase())}
                  placeholder="8N7A6D5E4F"
                  className="h-10 font-mono text-sm"
                  aria-invalid={(touched && !!errors.trx) || undefined}
                />
                <p
                  className={cn(
                    'type-helper',
                    touched && errors.trx ? 'text-[var(--status-danger-fg)]' : 'text-muted',
                  )}
                >
                  {touched && errors.trx ? errors.trx : t('seller.wallet.trxIdHint')}
                </p>
              </div>
            </div>
          </Panel>
        </div>
        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <Panel title={t('seller.wallet.paymentSummary')}>
            <dl className="space-y-2.5 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">{t('seller.wallet.available')}</dt>
                <dd>
                  <Money value={wallet.available} className="font-semibold" />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">{t('seller.wallet.amount')}</dt>
                <dd>
                  <Money
                    value={value}
                    signed
                    className="font-semibold text-[var(--status-ok-fg)]"
                  />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">{t('common.method')}</dt>
                <dd className="font-medium">{t(`payment.${method}`)}</dd>
              </div>
              <div className="border-line flex justify-between border-t pt-2.5">
                <dt className="text-ink font-semibold">{t('seller.wallet.newBalance')}</dt>
                <dd>
                  <Money
                    value={wallet.available + value}
                    className="text-ink text-lg font-extrabold"
                  />
                </dd>
              </div>
            </dl>
            <Button type="submit" variant="primary" size="lg" className="mt-5 w-full">
              <Icon name="moneyAdd" size={17} />
              {t('seller.wallet.addNow')} {value > 0 && money(value)}
            </Button>
            <Callout
              tone="neutral"
              compact
              className="mt-4"
              description={t('seller.wallet.gatewayNote')}
            />
          </Panel>
          {mine.length > 0 && (
            <Panel title={t('seller.wallet.recent')}>
              <ul className="divide-line -my-2 divide-y">
                {mine.map((d) => (
                  <li key={d.id} className="flex items-center justify-between py-2.5 text-[13px]">
                    <span>
                      <span className="text-ink block font-medium">{t(`payment.${d.method}`)}</span>
                      <span className="text-subtle num text-[11px]">{dateTime(d.createdAt)}</span>
                    </span>
                    <Money
                      value={d.amount}
                      signed
                      className="font-semibold text-[var(--status-ok-fg)]"
                    />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </form>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        tone="info"
        icon="moneyAdd"
        title={t('seller.wallet.addTitle')}
        description={`${t('seller.wallet.youPay')}: ${money(value)} · ${t(`payment.${method}`)}`}
        bullets={[
          { icon: 'receipt', text: `${t('seller.wallet.trxId')}: ${trx}` },
          {
            icon: 'wallet',
            text: `${t('seller.wallet.newBalance')}: ${money(wallet.available + value)}`,
          },
        ]}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          if (!seller) return;
          const res = addBalance(seller.id, value, method, trx);
          setConfirm(false);
          if (res.ok) setDone({ id: res.data, amount: value });
        }}
      />
    </div>
  );
}
