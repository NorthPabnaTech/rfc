'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';

import { processDepositAction, processWithdrawalAction } from '@/actions/resellers';
import { Taka } from '@/features/products/price';
import { StatusBadge, TableFrame } from '@components/shared';
import { Button } from '@components/ui/button';
import {
  WALLET_TX_STATUS_LABELS,
  WALLET_TX_TYPE_LABELS,
  type WalletTxStatus,
  type WalletTxType,
} from '@lib/constants';
import { toast } from '@lib/toast';
import { formatStoreDateTime } from '@lib/utils';

export type AdminTxRow = {
  id: string;
  txNumber: string;
  resellerId: string;
  shopName: string;
  resellerName: string;
  type: WalletTxType;
  direction: 'credit' | 'debit';
  amount: number;
  status: WalletTxStatus;
  paymentMethod?: string;
  paymentReference?: string;
  payoutMethod?: string;
  payoutAccount?: string;
  note?: string;
  createdAt: string;
};

export function TransactionsTable({ items }: { items: AdminTxRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function handleAction(row: AdminTxRow, action: 'approve' | 'reject') {
    setBusyId(row.id);
    const res =
      row.type === 'deposit'
        ? await processDepositAction(row.id, action)
        : await processWithdrawalAction(row.id, action);
    setBusyId(null);
    if (!res.ok) return toast.error(res.error);
    toast.success(action === 'approve' ? 'Transaction approved' : 'Transaction rejected');
    router.refresh();
  }

  return (
    <TableFrame>
      {items.length === 0 ? (
        <div className="text-muted p-10 text-center text-sm">No wallet transactions found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-line bg-well/60 text-muted border-b text-xs uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">TX #</th>
                <th className="px-4 py-3 font-semibold">Reseller</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Details</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {items.map((t) => {
                const canProcess =
                  t.status === 'pending' && (t.type === 'deposit' || t.type === 'withdrawal');
                return (
                  <tr key={t.id} className="hover:bg-well/40">
                    <td className="px-4 py-3 font-mono text-xs">
                      <div>{t.txNumber}</div>
                      <div className="text-muted text-[11px]">{formatStoreDateTime(t.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <Link
                        href={`/admin/resellers/${t.resellerId}`}
                        className="text-ink font-semibold hover:underline"
                      >
                        {t.shopName}
                      </Link>
                      <div className="text-muted">{t.resellerName}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{WALLET_TX_TYPE_LABELS[t.type]}</td>
                    <td
                      className={`px-4 py-3 font-semibold tabular-nums ${
                        t.direction === 'credit' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {t.direction === 'credit' ? '+' : '-'}
                      <Taka amount={t.amount} />
                    </td>
                    <td className="text-muted px-4 py-3 text-xs">
                      {t.payoutMethod && (
                        <div>
                          {t.payoutMethod}: {t.payoutAccount}
                        </div>
                      )}
                      {t.paymentMethod && (
                        <div>
                          {t.paymentMethod}
                          {t.paymentReference ? ` (${t.paymentReference})` : ''}
                        </div>
                      )}
                      {t.note && <div>{t.note}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={
                          t.status === 'completed'
                            ? 'ok'
                            : t.status === 'pending'
                              ? 'warn'
                              : 'danger'
                        }
                        label={WALLET_TX_STATUS_LABELS[t.status]}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canProcess ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            disabled={busyId === t.id}
                            onClick={() => handleAction(t, 'approve')}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyId === t.id}
                            onClick={() => handleAction(t, 'reject')}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </TableFrame>
  );
}
