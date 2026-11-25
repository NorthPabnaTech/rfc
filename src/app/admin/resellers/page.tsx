import type { Metadata } from 'next';

import { getAdminResellerCounts, listAdminResellers } from '@/services/resellers';
import { PageHeader } from '@components/shared';
import { requireAdminPage } from '@lib/auth/current-user';
import { param, type SearchParams } from '@lib/search-params';

import { ListToolbar } from '../components/list-toolbar';
import { ResellerStatusCards } from './components/reseller-status-cards';
import { ResellersTable } from './components/resellers-table';

export const metadata: Metadata = { title: 'Resellers' };

export default async function AdminResellersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const rawStatus = param(sp, 'status');
  const status = rawStatus === 'active' || rawStatus === 'inactive' ? rawStatus : undefined;
  const [docs, counts] = await Promise.all([
    listAdminResellers({ q: param(sp, 'q'), status }),
    getAdminResellerCounts(),
  ]);

  const items = docs.map((r) => ({
    id: String(r._id),
    name: r.name,
    shopName: r.shopName,
    email: r.email,
    phone: r.phone ?? '',
    avatarUrl: r.avatarUrl,
    isActive: r.isActive,
    walletBalance: r.walletBalance,
    totalOrders: r.totalOrders,
    totalSales: r.totalSales,
    totalProfitEarned: r.totalProfitEarned,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        title="Resellers"
        description={`${counts.total} registered reseller${counts.total === 1 ? '' : 's'}`}
      />
      <ResellerStatusCards counts={counts} />
      <ListToolbar
        searchPlaceholder="Shop, name, email or phone…"
        filters={[
          {
            name: 'status',
            label: 'Status',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ],
          },
        ]}
      />
      <ResellersTable items={items} />
    </>
  );
}
