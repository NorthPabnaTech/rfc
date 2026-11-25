'use client';

import Link from 'next/link';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore, useWallet } from '@/stores/platform-store';
import { Panel } from '@components/dashboard/panel';
import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { transactionColumns } from '@components/platform/columns';
import { WalletSummary } from '@components/platform/wallet-summary';
import { PageHeader } from '@components/shared';
import { Button } from '@components/ui/button';
import { DataTable } from '@components/ui/data-table';

import { useSellerRecords } from '../components/use-seller-data';

export default function WalletOverviewPage() {
  const i18n = useI18n();
  const { t, money } = i18n;
  const { seller, transactions } = useSellerRecords();
  const wallet = useWallet(seller?.id);
  const s = usePlatformStore((x) => x.settings);
  const fees = s.withdrawalFees;
  const steps: [IconRegistryKey, string, string][] = [
    [
      'moneyAdd',
      t('site.walletFlow.w1'),
      t('site.walletFlow.w1d', { min: money(s.minAddBalance) }),
    ],
    ['receipt', t('site.walletFlow.w2'), t('site.walletFlow.w2d')],
    ['clock', t('site.walletFlow.w3'), t('site.walletFlow.w3d')],
    [
      'moneySend',
      t('site.walletFlow.w4'),
      t('site.walletFlow.w4d', {
        min: money(s.minWithdrawal),
        low: money(fees.lowFee),
        high: money(fees.highFee),
        threshold: money(fees.threshold),
      }),
    ],
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('seller.wallet.title')}
        description={t('seller.wallet.subtitle')}

        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href="/seller/wallet/withdraw">
                <Icon name="moneySend" size={16} />
                {t('nav.withdraw')}
              </Link>
            </Button>
            <Button variant="primary" asChild>
              <Link href="/seller/wallet/add-balance">
                <Icon name="moneyAdd" size={16} />
                {t('nav.addBalance')}
              </Link>
            </Button>
          </>
        }
      />
      <WalletSummary wallet={wallet} />
      <Panel title={t('seller.wallet.howItWorks')}>
        <ol className="grid gap-3 md:grid-cols-4">
          {steps.map(([icon, title, desc], i) => (
            <li key={title} className="bg-well/50 relative rounded-xl p-4">
              <span className="bg-brand-soft text-brand-ink grid size-9 place-items-center rounded-lg">
                <Icon name={icon} size={18} />
              </span>
              <p className="text-ink mt-3 text-[13.5px] font-bold">{title}</p>
              <p className="text-muted mt-1 text-xs leading-relaxed">{desc}</p>
              {i < steps.length - 1 && (
                <Icon
                  name="chevRight"
                  size={18}
                  className="text-brand-300 absolute top-1/2 -right-3 z-10 hidden -translate-y-1/2 md:block"
                />
              )}
            </li>
          ))}
        </ol>
      </Panel>
      <Panel
        title={t('seller.wallet.recent')}
        href="/seller/wallet/transactions"
        hrefLabel={t('common.viewAll')}
        flush
      >
        <DataTable
          columns={transactionColumns(i18n)}
          source={transactions.slice(0, 8)}
          rowKey="id"
          classNames={{ root: 'rounded-none border-x-0 border-b-0' }}
          empty={{ title: t('common.noResults') }}
        />
      </Panel>
    </div>
  );
}
