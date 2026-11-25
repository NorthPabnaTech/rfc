import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CustomerAvatar } from '@/app/admin/customers/[id]/components/customer-avatar';
import { Taka } from '@/features/products/price';
import { getAdminResellerDetail } from '@/services/resellers';
import { PageHeader, StatCard, StatCardGrid, StatusBadge, TableFrame } from '@components/shared';
import { requireAdminPage } from '@lib/auth/current-user';
import {
  ORDER_STATUS_LABELS,
  WALLET_TX_STATUS_LABELS,
  WALLET_TX_TYPE_LABELS,
} from '@lib/constants';
import { formatStoreDate, formatStoreDateTime } from '@lib/utils';
import { objectId } from '@lib/validators/common';

import { ResellerDetailActions } from './components/reseller-detail-actions';

export const metadata: Metadata = { title: 'Reseller details' };

export default async function AdminResellerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  if (!objectId.safeParse(id).success) notFound();

  const detail = await getAdminResellerDetail(id);
  if (!detail) notFound();

  const { reseller, orders, transactions, changeLogs } = detail;

  return (
    <div className="space-y-6">
      <PageHeader
        title={reseller.shopName}
        subtitle={`${reseller.name}${reseller.phone ? ` · ${reseller.phone}` : ''} · ${reseller.email}`}
        backHref="/admin/resellers"
        backLabel="Resellers"
        leading={<CustomerAvatar name={reseller.name} avatarUrl={reseller.avatarUrl} />}
        actions={
          <div className="flex items-center gap-2.5">
            <StatusBadge
              status={reseller.isActive ? 'ok' : 'danger'}
              label={reseller.isActive ? 'Active' : 'Inactive'}
            />
            <ResellerDetailActions resellerId={String(reseller._id)} />
          </div>
        }
      />

      <StatCardGrid>
        <StatCard label="Wallet Balance" value={<Taka amount={reseller.walletBalance} />} icon="coin" />
        <StatCard label="Total Orders" value={String(reseller.totalOrders)} icon="cart" />
        <StatCard label="Total Sales" value={<Taka amount={reseller.totalSales} />} icon="trend" />
        <StatCard label="Total Profit Earned" value={<Taka amount={reseller.totalProfitEarned} />} icon="tag" tone="ok" />
      </StatCardGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="bg-panel hairline rounded-xl2 p-5">
          <h2 className="text-ink mb-3 text-[14px] font-semibold">Profile &amp; Contact Information</h2>
          <dl className="divide-line divide-y text-sm">
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted">Full Name</dt>
              <dd className="text-ink text-right font-medium">{reseller.name}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted">Shop Name</dt>
              <dd className="text-ink text-right font-medium">{reseller.shopName}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted">Email</dt>
              <dd className="text-ink text-right font-medium">{reseller.email}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted">Phone</dt>
              <dd className="text-ink text-right font-medium">{reseller.phone || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted">Address</dt>
              <dd className="text-ink max-w-xs text-right font-medium">{reseller.address || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted">Member Since</dt>
              <dd className="text-ink text-right">{formatStoreDate(reseller.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted">Last Sign-in</dt>
              <dd className="text-ink text-right">
                {reseller.lastLoginAt ? formatStoreDateTime(reseller.lastLoginAt) : '—'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="bg-panel hairline rounded-xl2 p-5">
          <h2 className="text-ink mb-3 text-[14px] font-semibold">Payout &amp; Wallet Summary</h2>
          <dl className="divide-line divide-y text-sm">
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted">bKash</dt>
              <dd className="text-ink text-right font-mono font-medium">
                {reseller.payoutDetails?.bkash || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted">Nagad</dt>
              <dd className="text-ink text-right font-mono font-medium">
                {reseller.payoutDetails?.nagad || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted">Bank Info</dt>
              <dd className="text-ink max-w-xs text-right whitespace-pre-wrap font-medium">
                {reseller.payoutDetails?.bankInfo || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted">Total Deposited</dt>
              <dd className="text-ink text-right font-semibold tabular-nums">
                <Taka amount={reseller.totalDeposited} />
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted">Total Withdrawn</dt>
              <dd className="text-ink text-right font-semibold tabular-nums">
                <Taka amount={reseller.totalWithdrawn} />
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <TableFrame>
        <div className="border-line border-b px-4 py-3 text-sm font-semibold">Recent Reseller Orders</div>
        {orders.length === 0 ? (
          <p className="text-muted p-6 text-sm">No orders placed yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-line bg-well/60 text-muted border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Reseller Profit</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {orders.map((o) => (
                  <tr key={String(o._id)} className="hover:bg-well/40">
                    <td className="px-4 py-3 font-semibold">
                      <Link href={`/admin/orders/${String(o._id)}`} className="hover:underline">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div>{o.customer.name}</div>
                      <div className="text-muted">{o.customer.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-emerald-600 tabular-nums">
                      <Taka amount={o.resellerSummary?.expectedResellerProfit ?? 0} />
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <Taka amount={o.total} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={o.status === 'delivered' ? 'ok' : o.status === 'cancelled' ? 'danger' : 'info'}
                        label={ORDER_STATUS_LABELS[o.status]}
                      />
                    </td>
                    <td className="text-muted px-4 py-3 text-xs">
                      {formatStoreDateTime(o.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableFrame>

      <TableFrame>
        <div className="border-line border-b px-4 py-3 text-sm font-semibold">Transaction History</div>
        {transactions.length === 0 ? (
          <p className="text-muted p-6 text-sm">No wallet transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-line bg-well/60 text-muted border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">TX #</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Balance After</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Note</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {transactions.map((t) => (
                  <tr key={String(t._id)} className="hover:bg-well/40">
                    <td className="px-4 py-3 font-mono text-xs">{t.txNumber}</td>
                    <td className="px-4 py-3 text-xs">{WALLET_TX_TYPE_LABELS[t.type]}</td>
                    <td
                      className={`px-4 py-3 font-semibold tabular-nums ${
                        t.direction === 'credit' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {t.direction === 'credit' ? '+' : '-'}
                      <Taka amount={t.amount} />
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <Taka amount={t.balanceAfter} />
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
                    <td className="text-muted px-4 py-3 text-xs">{t.note ?? '—'}</td>
                    <td className="text-muted px-4 py-3 text-xs">
                      {formatStoreDateTime(t.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableFrame>
      <TableFrame>
        <div className="border-line border-b px-4 py-3 text-sm font-semibold">
          Profile &amp; Payout Change History
        </div>
        {changeLogs.length === 0 ? (
          <p className="text-muted p-6 text-sm">No profile or payout changes recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-line bg-well/60 text-muted border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date &amp; Time</th>
                  <th className="px-4 py-3 font-semibold">Field</th>
                  <th className="px-4 py-3 font-semibold">Previous Value</th>
                  <th className="px-4 py-3 font-semibold">New Value</th>
                  <th className="px-4 py-3 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {changeLogs.flatMap((log) =>
                  log.changes.map((c, idx) => (
                    <tr key={`${String(log._id)}-${c.field}-${idx}`} className="hover:bg-well/40">
                      <td className="text-muted px-4 py-3 text-xs whitespace-nowrap">
                        {formatStoreDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">{c.label}</td>
                      <td className="text-muted max-w-xs truncate px-4 py-3 font-mono text-xs">
                        {c.oldValue || '—'}
                      </td>
                      <td className="text-ink max-w-xs truncate px-4 py-3 font-mono text-xs font-medium">
                        {c.newValue || '—'}
                      </td>
                      <td className="text-muted px-4 py-3 font-mono text-xs">
                        {log.ipAddress || '—'}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        )}
      </TableFrame>
    </div>
  );
}
