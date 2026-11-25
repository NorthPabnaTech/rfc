'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';

import { toggleResellerActiveAction } from '@/actions/resellers';
import { Taka } from '@/features/products/price';
import { ConfirmDialog, StatusBadge, TableFrame } from '@components/shared';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { Dropdown } from '@components/ui/dropdown';
import { toast } from '@lib/toast';
import { formatStoreDate } from '@lib/utils';

export type ResellerRow = {
  id: string;
  name: string;
  shopName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  isActive: boolean;
  walletBalance: number;
  totalOrders: number;
  totalSales: number;
  totalProfitEarned: number;
  createdAt: string;
};

export function ResellersTable({ items }: { items: ResellerRow[] }) {
  const router = useRouter();
  const [confirmTarget, setConfirmTarget] = React.useState<ResellerRow | null>(null);

  async function onConfirmToggle() {
    if (!confirmTarget) return;
    const res = await toggleResellerActiveAction(confirmTarget.id, !confirmTarget.isActive);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(confirmTarget.isActive ? 'Reseller deactivated' : 'Reseller activated');
    setConfirmTarget(null);
    router.refresh();
  }

  return (
    <>
      <TableFrame>
      {items.length === 0 ? (
        <div className="text-muted p-10 text-center text-sm">
          No resellers found. Resellers can register via the Reseller API.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-line bg-well/60 text-muted border-b text-xs uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Reseller / Shop</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Wallet</th>
                <th className="px-4 py-3 font-semibold">Orders</th>
                <th className="px-4 py-3 font-semibold">Sales & Profit</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {items.map((r) => (
                <tr key={r.id} className="hover:bg-well/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {r.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- small reseller avatar
                        <img
                          src={r.avatarUrl}
                          alt=""
                          className="size-9 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="bg-brand/15 text-brand grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold">
                          {(r.name || r.shopName).trim().charAt(0).toUpperCase() || 'R'}
                        </span>
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/admin/resellers/${r.id}`}
                          className="text-ink font-semibold hover:underline"
                        >
                          {r.shopName}
                        </Link>
                        <div className="text-muted text-xs">{r.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="text-ink">{r.phone}</div>
                    <div className="text-muted">{r.email}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    <Taka amount={r.walletBalance} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">{r.totalOrders}</td>
                  <td className="px-4 py-3 text-xs tabular-nums">
                    <div>
                      Sales: <Taka amount={r.totalSales} />
                    </div>
                    <div className="text-emerald-600">
                      Profit: <Taka amount={r.totalProfitEarned} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={r.isActive ? 'ok' : 'danger'}
                      label={r.isActive ? 'Active' : 'Inactive'}
                    />
                    <div className="text-muted mt-1 text-[11px]">
                      Joined {formatStoreDate(r.createdAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Dropdown
                      align="end"
                      items={[
                        {
                          label: 'Details',
                          icon: 'eye',
                          onClick: () => router.push(`/admin/resellers/${r.id}`),
                        },
                        { type: 'separator' },
                        {
                          label: r.isActive ? 'Deactivate' : 'Activate',
                          icon: r.isActive ? 'eyeOff' : 'checkCircle',
                          destructive: r.isActive,
                          onClick: () => setConfirmTarget(r),
                        },
                      ]}
                    >
                      <Button variant="ghost" size="icon-sm" aria-label="Actions">
                        <Icon name="more" size={16} />
                      </Button>
                    </Dropdown>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </TableFrame>
      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        tone={confirmTarget?.isActive ? 'danger' : 'info'}
        title={confirmTarget?.isActive ? 'Deactivate this reseller?' : 'Activate this reseller?'}
        description={
          confirmTarget?.isActive
            ? `“${confirmTarget.shopName}” will no longer be able to place orders or access the reseller portal until reactivated.`
            : `“${confirmTarget?.shopName}” will regain full access to place orders and use the reseller portal.`
        }
        confirmLabel={confirmTarget?.isActive ? 'Deactivate' : 'Activate'}
        onConfirm={onConfirmToggle}
      />
    </>
  );
}
