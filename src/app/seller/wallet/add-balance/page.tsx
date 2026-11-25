'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { useI18n } from '@/i18n/provider';
import { useResellerAuth } from '@/stores/reseller-auth';
import { Panel } from '@components/dashboard/panel';
import { Icon } from '@components/icon/icon';
import { Money } from '@components/platform/money';
import { StatusPill } from '@components/platform/status-pill';
import { Callout, ConfirmDialog, PageHeader } from '@components/shared';
import { CurrencyInput } from '@components/shared/numeric-format-input';
import { Button } from '@components/ui/button';
import { resellerApi, type DepositResponse } from '@lib/api/reseller';
import { toast } from '@lib/toast';
import { cn } from '@lib/utils';

import { useSellerTransactions, useSellerWallet } from '../../components/use-seller-data';

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
  const router = useRouter();
  const params = useSearchParams();
  const reseller = useResellerAuth((s) => s.reseller);
  const refreshMe = useResellerAuth((s) => s.refreshMe);
  const { wallet, reload: reloadWallet } = useSellerWallet();
  const { items: recentDeposits, reload: reloadTx } = useSellerTransactions({
    page: 1,
    limit: 5,
    type: 'deposit',
  });

  const [amount, setAmount] = React.useState<number | undefined>(
    Number(params.get('amount')) || undefined,
  );
  const [touched, setTouched] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [cancelledOpen, setCancelledOpen] = React.useState(false);
  const [done, setDone] = React.useState<DepositResponse | null>(null);

  const paymentlyStatus = params.get('paymently');
  const invoiceId = params.get('invoice_id');

  React.useEffect(() => {
    if (paymentlyStatus === 'cancelled') {
      setCancelledOpen(true);
      router.replace('/seller/wallet/add-balance');
      return;
    }
    if (paymentlyStatus !== 'success' || !invoiceId) return;
    const processedKey = `paymently_deposit_${invoiceId}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(processedKey)) return;

    let active = true;
    setVerifying(true);
    fetch('/api/payments/paymently/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId }),
    })
      .then((r) => r.json())
      .then(async (json) => {
        if (!active) return;
        if (!json.ok || !json.data) {
          throw new Error(json.error || 'Could not verify payment.');
        }
        const v = json.data as {
          status: string;
          amount: number;
          invoiceId: string;
          transactionId?: string;
          paymentMethod?: string;
          senderNumber?: string;
        };
        if (v.status !== 'COMPLETED') {
          throw new Error(`Payment is ${v.status.toLowerCase()}. Please wait or try again.`);
        }
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(processedKey, '1');
        }
        const res = await resellerApi.deposit({
          amount: v.amount,
          paymentMethod: (v.paymentMethod || 'bkash').toLowerCase(),
          paymentReference: v.transactionId || v.invoiceId,
          note: [
            'Paid via Paymently',
            v.senderNumber ? `From ${v.senderNumber}` : '',
            `Invoice ${v.invoiceId}`,
          ]
            .filter(Boolean)
            .join(' · '),
        });
        if (!active) return;
        setDone(res);
        await Promise.all([refreshMe(), reloadWallet(), reloadTx()]);
        toast.success(t('seller.wallet.addSuccess'));
      })
      .catch((err) => {
        if (!active) return;
        toast.error(err instanceof Error ? err.message : t('common.somethingWrong'));
      })
      .finally(() => {
        if (active) setVerifying(false);
      });

    return () => {
      active = false;
    };
  }, [paymentlyStatus, invoiceId, refreshMe, reloadWallet, reloadTx, router, t]);

  const minDeposit = wallet.minDeposit || 100;
  const value = amount ?? 0;
  const amountError =
    value < minDeposit ? t('seller.wallet.minAdd', { amount: money(minDeposit) }) : null;

  const startOnlinePayment = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/payments/paymently/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: value,
          fullName: reseller?.name || 'Reseller',
          email: reseller?.email || 'reseller@example.com',
          resellerId: reseller?.id || '',
        }),
      });
      const json = (await res.json()) as { ok?: boolean; paymentUrl?: string; error?: string };
      if (!res.ok || !json.ok || !json.paymentUrl) {
        throw new Error(json.error || 'Could not start online payment.');
      }
      window.location.href = json.paymentUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWrong'));
      setSubmitting(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (amountError) return;
    void startOnlinePayment();
  };

  if (verifying) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="skeleton mx-auto size-16 rounded-full" />
        <h1 className="type-section-title text-ink mt-5">Verifying your Paymently payment…</h1>
        <p className="type-body text-muted mt-1.5">
          Please wait a moment while we confirm your transaction.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg py-8 text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-[var(--status-ok-bg)] text-[var(--status-ok-fg)]">
          <Icon name="checkCircle" size={40} />
        </span>
        <h1 className="type-page-title text-ink mt-6">{t('seller.wallet.addSuccess')}</h1>
        <p className="type-body text-muted mt-2">
          Deposit request submitted for {money(done.amount)}. Once approved by admin, your wallet
          balance will be credited automatically.
        </p>
        <div className="bg-panel border-line mt-6 space-y-2 rounded-2xl border p-4 text-left text-[13px]">
          <div className="flex justify-between">
            <span className="text-muted">{t('common.reference')}</span>
            <span className="font-mono text-xs">{done.txNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{t('common.method')}</span>
            <span className="font-medium uppercase">{done.paymentMethod}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">TrxID</span>
            <span className="font-mono text-xs">{done.paymentReference}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{t('common.status')}</span>
            <StatusPill kind="deposit" value={done.status} />
          </div>
        </div>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="primary" asChild>
            <Link href="/seller/wallet/transactions">{t('nav.transactions')}</Link>
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
              placeholder={`Min ${minDeposit}`}
            />
            {touched && amountError && (
              <p className="mt-2 text-xs font-medium text-[var(--status-danger-fg)]">
                {amountError}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(q)}
                  className={cn(
                    'focus-ring num rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
                    amount === q
                      ? 'bg-brand border-brand text-white'
                      : 'bg-panel border-line text-muted hover:text-ink',
                  )}
                >
                  {money(q)}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title={t('seller.wallet.method')}>
            <div className="border-brand bg-brand-soft/60 flex items-center justify-between rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <span className="bg-brand grid size-10 place-items-center rounded-xl text-white">
                  <Icon name="wallet" size={18} />
                </span>
                <div>
                  <p className="text-ink text-sm font-semibold">UddoktaPay</p>
                  <p className="text-muted text-xs">
                    bKash, Nagad, Rocket &amp; Cards (Instant Online Payment)
                  </p>
                </div>
              </div>
              <span className="bg-brand rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white">
                Active
              </span>
            </div>
          </Panel>

          <Button type="submit" variant="primary" size="lg" disabled={submitting}>
            <Icon name="moneyAdd" size={17} />
            {submitting ? t('common.loading') : 'Pay with UddoktaPay'}
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
                <dt className="text-muted">{t('seller.wallet.amount')}</dt>
                <dd>
                  <Money value={value} className="font-semibold" />
                </dd>
              </div>
            </dl>
            <Callout
              tone="info"
              compact
              className="mt-4"
              description="Deposit requests are created as pending and credited automatically once approved by RFC Gadget admin."
            />
          </Panel>

          {recentDeposits.length > 0 && (
            <Panel title="Recent Deposits">
              <ul className="space-y-2.5">
                {recentDeposits.map((d) => (
                  <li
                    key={d.id}
                    className="border-line flex items-center justify-between rounded-xl border p-3 text-xs"
                  >
                    <div>
                      <p className="text-ink font-semibold">
                        <Money value={d.amount} /> · {d.paymentMethod?.toUpperCase()}
                      </p>
                      <p className="text-subtle mt-0.5">
                        {d.txNumber} · {dateTime(d.createdAt)}
                      </p>
                    </div>
                    <StatusPill
                      kind="deposit"
                      value={d.status === 'rejected' ? 'failed' : d.status}
                    />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={cancelledOpen}
        onOpenChange={setCancelledOpen}
        tone="danger"
        title="Payment Cancelled"
        description="Your online payment via UddoktaPay was cancelled. No amount was deducted."
        confirmLabel="OK"
        onConfirm={() => setCancelledOpen(false)}
      />
    </div>
  );
}
