import type { Metadata } from 'next';

import { DashboardShell } from '@components/layout/dashboard-shell';
import { ADMIN_NAV } from '@config/navigation';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s · Admin' } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell role="admin" groups={ADMIN_NAV}>
      {children}
    </DashboardShell>
  );
}
