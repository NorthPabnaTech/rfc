import type { Metadata } from 'next';

import { DashboardShell } from '@components/layout/dashboard-shell';
import { SELLER_NAV } from '@config/navigation';

export const metadata: Metadata = { title: { default: 'Seller', template: '%s · Seller' } };

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell role="seller" groups={SELLER_NAV}>
      {children}
    </DashboardShell>
  );
}
