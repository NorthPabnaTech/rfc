import type { Metadata } from 'next';

import { getAdminWalletTxCounts, listAdminWalletTransactions } from '@/services/resellers';
import { PageHeader } from '@components/shared';
import { requireAdminPage } from '@lib/auth/current-user';
import {
  WALLET_TX_STATUS_LABELS,
  WALLET_TX_STATUSES,
  WALLET_TX_TYPE_LABELS,
  WALLET_TX_TYPES,
  type WalletTxStatus,
  type WalletTxType,
} from '@lib/constants';
import { param, type SearchParams } from '@lib/search-params';

import { ListToolbar } from '../../components/list-toolbar';
import { TransactionStatusCards } from './components/transaction-status-cards';
import { TransactionsTable } from './components/transactions-table';

export const metadata: Metadata = { title: 'Reseller Wallet & Payouts' };

export default async function AdminResellerTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const rawStatus = param(sp, 'status') as WalletTxStatus | undefined;
  const rawType = param(sp, 'type') as WalletTxType | undefined;
  const status = rawStatus && WALLET_TX_STATUSES.includes(rawStatus) ? rawStatus : undefined;
  const type = rawType && WALLET_TX_TYPES.includes(rawType) ? rawType : undefined;

  const [docs, counts] = await Promise.all([
    listAdminWalletTransactions({ status, type }),
    getAdminWalletTxCounts(),
  ]);
  const items = docs.map((t) => {
    const r = t.reseller as unknown as { _id?: unknown; shopName?: string; name?: string } | null;
    return {
      id: String(t._id),
      txNumber: t.txNumber,
      resellerId: r?._id ? String(r._id) : String(t.reseller),
      shopName: r?.shopName ?? 'Reseller',
      resellerName: r?.name ?? '',
      type: t.type,
      direction: t.direction,
      amount: t.amount,
      status: t.status,
      paymentMethod: t.paymentMethod,
      paymentReference: t.paymentReference,
      payoutMethod: t.payoutMethod,
      payoutAccount: t.payoutAccount,
      note: t.note,
      createdAt: t.createdAt.toISOString(),
    };
  });

  return (
    <>
      <PageHeader
        title="Wallet & Payouts"
        description="Approve reseller deposits, process withdrawal requests, and audit wallet history."
      />
      <TransactionStatusCards counts={counts} />
      <ListToolbar
        filters={[
          {
            name: 'status',
            label: 'Status',
            options: WALLET_TX_STATUSES.map((s) => ({ value: s, label: WALLET_TX_STATUS_LABELS[s] })),
          },
          {
            name: 'type',
            label: 'Type',
            options: WALLET_TX_TYPES.map((t) => ({ value: t, label: WALLET_TX_TYPE_LABELS[t] })),
          },
        ]}
      />
      <TransactionsTable items={items} />
    </>
  );
}
