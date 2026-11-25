'use client';

import * as React from 'react';

import { useI18n } from '@/i18n/provider';
import { useResellerAuth } from '@/stores/reseller-auth';
import type { PaymentMethod } from '@/types/platform';
import { Panel } from '@components/dashboard/panel';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { Callout, ConfirmDialog, PageHeader } from '@components/shared';
import { CurrencyInput } from '@components/shared/numeric-format-input';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { ApiError } from '@lib/api/client';
import { resellerApi } from '@lib/api/reseller';
import { toast } from '@lib/toast';
import { BD_PHONE } from '@lib/validators/reseller';

import { useSellerWallet } from '../../components/use-seller-data';
import { MethodPicker } from '../components/method-picker';

export default function WithdrawPage() {
  const { t, money } = useI18n();
  const reseller = useResellerAuth((s) => s.reseller);
  const refreshMe = useResellerAuth((s) => s.refreshMe);
  const { wallet, reload: reloadWallet } = useSellerWallet();

  const defaultAccount =
    reseller?.payoutDetails?.bkash || reseller?.payoutDetails?.nagad || '';

  const [amount, setAmount] = React.useState<number | undefined>();
  const [method, setMethod] = React.useState<PaymentMethod>('bkash');
  const [account, setAccount] = React.useState(defaultAccount);
  const [note, setNote] = React.useState('');
  const [confirm, setConfirm] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  const minWithdrawal = wallet.minWithdrawal || 50;
  const val = amount ?? 0;

  const trimmedAccount = account.trim();
  const accountError = !trimmedAccount
    ? t('common.required')
    : !BD_PHONE.test(trimmedAccount)
      ? t('common.invalidPhone')
      : null;
  const exceedsBalance = val > wallet.walletBalance;
  const amountError = exceedsBalance
    ? t('seller.wallet.exceeds', { amount: money(wallet.walletBalance) })
    : val < minWithdrawal
      ? t('seller.wallet.minWithdraw', { amount: money(minWithdrawal) })
      : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!amountError && !accountError) setConfirm(true);
  };

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payoutMethodLabel = method === 'bkash' ? 'bKash' : 'Nagad';
      await resellerApi.withdraw({
        amount: val,
        payoutMethod: payoutMethodLabel,
        payoutAccount: trimmedAccount,
        note: note.trim() || undefined,
      });
      setConfirm(false);
      setAmount(undefined);
      setNote('');
      setTouched(false);
      await Promise.all([refreshMe(), reloadWallet()]);
      toast.success('Withdrawal request submitted');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('common.somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  };

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
                <Money value={wallet.walletBalance} className="text-ink font-bold" />
              </span>
            }
          >
            <CurrencyInput
              value={amount}
              onValueChange={(v: number | undefined) => setAmount(v)}
              placeholder={`Min ${minWithdrawal}`}
              aria-invalid={(exceedsBalance || (touched && !!amountError)) || undefined}
            />
            {(exceedsBalance || (touched && amountError)) && (
              <p className="mt-2 text-xs font-medium text-[var(--status-danger-fg)]">
                {exceedsBalance
                  ? t('seller.wallet.exceeds', { amount: money(wallet.walletBalance) })
                  : amountError}
              </p>
            )}
          </Panel>

          <Panel title={t('seller.profile.payout')}>
            <MethodPicker value={method} onChange={setMethod} methods={['bkash', 'nagad']} />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="type-label text-ink mb-1.5 block">
                  {t('seller.profile.payoutAccount')}
                </label>
                <Input
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="01712345678"
                  inputMode="tel"
                  aria-invalid={((touched || trimmedAccount.length > 0) && !!accountError) || undefined}
                />
                {(touched || trimmedAccount.length > 0) && accountError && (
                  <p className="mt-1.5 text-xs text-[var(--status-danger-fg)]">{accountError}</p>
                )}
              </div>
              <div>
                <label className="type-label text-ink mb-1.5 block">{t('common.note')}</label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Personal bKash"
                />
              </div>
            </div>
          </Panel>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={val <= 0 || wallet.walletBalance <= 0 || exceedsBalance || submitting}
          >
            <Icon name="moneySend" size={17} />
            {t('nav.withdraw')}
          </Button>
        </div>

        <div className="space-y-5">
          <Panel title={t('seller.order.summary')}>
            <dl className="divide-line divide-y text-[13px]">
              <div className="flex justify-between py-2.5">
                <dt className="text-muted">{t('seller.wallet.available')}</dt>
                <dd>
                  <Money value={wallet.walletBalance} className="font-bold" />
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-muted">{t('seller.wallet.withdrawAmount')}</dt>
                <dd>
                  <Money value={val} className="font-semibold" />
                </dd>
              </div>
            </dl>
            <Callout
              tone="info"
              compact
              className="mt-4"
              description="Withdrawal amount is held immediately from your wallet balance. If rejected by admin, it is automatically refunded."
            />
          </Panel>
        </div>
      </form>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Confirm Withdrawal"
        description={`Withdraw ${money(val)} to ${account}?`}
        confirmLabel={submitting ? t('common.loading') : t('common.confirm')}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
