'use client';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import { KpiCard } from '@components/dashboard/panel';
import type { WalletSummary as Summary } from '@lib/business/wallet';

/** The five wallet cards: available, pending, total earnings, withdrawn, charges. */
export function WalletSummary({ wallet, className }: { wallet: Summary; className?: string }) {
  const { t, money } = useI18n();
  const hours = usePlatformStore((s) => s.settings.earningsReleaseHours);
  return (
    <div className={className ?? 'grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5'}>
      <div className="from-brand-500 to-brand-800 relative col-span-2 overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white lg:col-span-1">
        <span
          className="absolute -top-10 -right-10 size-32 rounded-full bg-white/10 blur-xl"
          aria-hidden
        />
        <p className="relative text-[12.5px] font-medium text-white/80">
          {t('seller.wallet.available')}
        </p>
        <p className="num relative mt-2 text-[26px] leading-tight font-extrabold">
          {money(wallet.available)}
        </p>
        <p className="relative mt-1 text-[11.5px] text-white/70">
          {t('seller.wallet.availableHint')}
        </p>
      </div>
      <KpiCard
        label={t('seller.wallet.pending')}
        value={money(wallet.pending)}
        icon="clock"
        tone="warn"
        hint={t('seller.wallet.pendingHint', { hours })}
      />
      <KpiCard
        label={t('seller.wallet.totalEarnings')}
        value={money(wallet.totalEarnings)}
        icon="moneyBag"
        tone="ok"
      />
      <KpiCard
        label={t('seller.wallet.totalWithdrawn')}
        value={money(wallet.totalWithdrawn)}
        icon="moneySend"
        tone="info"
      />
      <KpiCard
        label={t('seller.wallet.totalCharges')}
        value={money(wallet.totalCharges)}
        icon="receipt"
        tone="sun"
      />
    </div>
  );
}
