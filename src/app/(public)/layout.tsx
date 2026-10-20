import { getCategoryTree } from '@/services/catalog';
import { getNotificationFeed } from '@/services/notifications';
import { getSettings } from '@/services/settings';
import { getCurrentUser } from '@lib/auth/current-user';
import { realtimeClientConfig } from '@lib/realtime/channels';

import { CartDrawer } from './components/cart-drawer';
import { SiteFooter } from './components/site-footer';
import { SiteHeader } from './components/site-header';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories, user] = await Promise.all([
    getSettings(),
    getCategoryTree(),
    getCurrentUser(),
  ]);
  const notifications = user ? await getNotificationFeed(user.id) : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="focus:bg-brand focus:text-brand-contrast sr-only z-50 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:rounded-lg focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <SiteHeader
        categories={categories}
        user={user && { name: user.name, role: user.role, avatarUrl: user.avatarUrl }}
        supportPhone={settings.supportPhone}
        announcement={settings.announcement}
        notifications={
          user && notifications
            ? { userId: user.id, initial: notifications, realtime: realtimeClientConfig() }
            : null
        }
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter settings={settings} categories={categories} />
      <CartDrawer />
    </div>
  );
}
