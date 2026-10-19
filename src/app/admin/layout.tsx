import type { Metadata } from 'next';
import Link from 'next/link';

import { getAdminBadges } from '@/services/dashboard';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { requireAdminPage } from '@lib/auth/current-user';

import { AdminMobileNav, AdminSidebar } from './components/admin-sidebar';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · RFC Gadget Admin' },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();
  const badges = await getAdminBadges();
  const shellUser = { name: user.name, email: user.email };

  return (
    <div className="bg-surface flex min-h-dvh">
      <AdminSidebar badges={badges} user={shellUser} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-line sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-white/85 px-4 backdrop-blur sm:px-6">
          <AdminMobileNav badges={badges} user={shellUser} />
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" target="_blank">
                <Icon name="external" size={15} /> View store
              </Link>
            </Button>
            <Button variant="primary" size="sm" asChild>
              <Link href="/admin/orders/new">
                <Icon name="plus" size={15} /> Manual order
              </Link>
            </Button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
