import type { IconRegistryKey } from '@components/icon/icon';

export type AdminNavItem = {
  href: string;
  label: string;
  icon: IconRegistryKey;
  /** Key into the badge counts passed from the layout. */
  badge?: 'pendingOrders' | 'openReturns' | 'unansweredQuestions';
};

export const ADMIN_NAV: { title: string; items: AdminNavItem[] }[] = [
  {
    title: 'Overview',
    items: [{ href: '/admin/dashboard', label: 'Dashboard', icon: 'grid' }],
  },
  {
    title: 'Sales',
    items: [
      { href: '/admin/orders', label: 'Orders', icon: 'cart', badge: 'pendingOrders' },
      { href: '/admin/returns', label: 'Returns', icon: 'refresh', badge: 'openReturns' },
      { href: '/admin/customers', label: 'Customers', icon: 'users' },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { href: '/admin/products', label: 'Products', icon: 'box' },
      { href: '/admin/categories', label: 'Categories', icon: 'folder' },
      { href: '/admin/tags', label: 'Tags', icon: 'tag' },
      { href: '/admin/suppliers', label: 'Suppliers', icon: 'store' },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { href: '/admin/banners', label: 'Banners', icon: 'image' },
      { href: '/admin/combos', label: 'Combo offers', icon: 'layers' },
    ],
  },
  {
    title: 'Engagement',
    items: [
      { href: '/admin/reviews', label: 'Reviews', icon: 'star' },
      {
        href: '/admin/questions',
        label: 'Questions',
        icon: 'question',
        badge: 'unansweredQuestions',
      },
    ],
  },
  {
    title: 'System',
    items: [{ href: '/admin/settings', label: 'Settings', icon: 'settings' }],
  },
];
