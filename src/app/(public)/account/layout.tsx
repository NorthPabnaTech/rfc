import { requireUserPage } from '@lib/auth/current-user';

import { AccountNav } from './components/account-nav';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage('/account');
  return (
    <div className="container-page py-10">
      <div className="mb-8">
        <p className="text-muted text-sm">Hello,</p>
        <h1 className="type-display text-ink">{user.name}</h1>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[230px_minmax(0,1fr)]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
