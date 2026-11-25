import type { TKey } from '@/i18n/provider';
import type { IconRegistryKey } from '@components/icon/icon';

/*
 * Sidebar navigation for both roles. Labels are translation keys. `match`
 * controls the active state: 'exact' for index routes, and `query` for list
 * pages filtered by a URL param (e.g. /admin/orders?status=shipped).
 */
export type NavItem = {
  label: TKey;
  href: string;
  icon: IconRegistryKey;
  exact?: boolean;
  /** Active only when this query param matches (and absent → "all"). */
  query?: { key: string; value: string | null };
  external?: 'telegram-support' | 'telegram-group';
};

export type NavGroup = { label: TKey; items: NavItem[] };

export const SELLER_NAV: NavGroup[] = [
  {
    label: 'nav.groups.overview',
    items: [{ label: 'nav.dashboard', href: '/seller', icon: 'grid', exact: true }],
  },
  {
    label: 'nav.groups.catalog',
    items: [{ label: 'nav.products', href: '/seller/products', icon: 'box' }],
  },
  {
    label: 'nav.groups.sales',
    items: [
      { label: 'nav.myOrders', href: '/seller/orders', icon: 'cart' },
      { label: 'nav.tracking', href: '/seller/tracking', icon: 'shipping' },
      { label: 'nav.invoices', href: '/seller/invoices', icon: 'receipt' },
    ],
  },
  {
    label: 'nav.groups.wallet',
    items: [
      { label: 'nav.walletOverview', href: '/seller/wallet', icon: 'wallet' },
      { label: 'nav.transactions', href: '/seller/wallet/transactions', icon: 'exchange' },
      { label: 'nav.earnings', href: '/seller/wallet/earnings', icon: 'moneyBag' },
    ],
  },
  {
    label: 'nav.groups.support',
    items: [{ label: 'nav.help', href: '/seller/support', icon: 'support' }],
  },
  {
    label: 'nav.groups.account',
    items: [{ label: 'nav.profile', href: '/seller/profile', icon: 'userCircle' }],
  },
];

const orderLink = (label: TKey, icon: IconRegistryKey, status: string | null): NavItem => ({
  label,
  icon,
  href: status ? `/admin/orders?status=${status}` : '/admin/orders',
  query: { key: 'status', value: status },
});

const sellerLink = (label: TKey, icon: IconRegistryKey, status: string | null): NavItem => ({
  label,
  icon,
  href: status ? `/admin/sellers?status=${status}` : '/admin/sellers',
  query: { key: 'status', value: status },
});

export const ADMIN_NAV: NavGroup[] = [
  {
    label: 'nav.groups.overview',
    items: [
      { label: 'nav.dashboard', href: '/admin', icon: 'grid', exact: true },
      { label: 'nav.analysis', href: '/admin/analysis', icon: 'analytics' },
    ],
  },
  {
    label: 'nav.groups.catalog',
    items: [
      { label: 'nav.products', href: '/admin/products', icon: 'box' },
      { label: 'nav.categories', href: '/admin/categories', icon: 'layers' },
      { label: 'nav.suppliers', href: '/admin/suppliers', icon: 'truck' },
    ],
  },
  {
    label: 'nav.groups.sellers',
    items: [
      sellerLink('nav.allSellers', 'users', null),
      sellerLink('nav.activeSellers', 'userCheck', 'active'),
      sellerLink('nav.pendingSellers', 'userAdd', 'pending'),
    ],
  },
  {
    label: 'nav.groups.sales',
    items: [
      orderLink('nav.allOrders', 'cart', null),
      orderLink('nav.pendingOrders', 'clock', 'pending'),
      orderLink('nav.processing', 'processing', 'processing'),
      orderLink('nav.shipped', 'shipping', 'shipped'),
      orderLink('nav.delivered', 'delivered', 'delivered'),
      orderLink('nav.cancelled', 'cancelCircle', 'cancelled'),
      orderLink('nav.returned', 'refresh', 'returned'),
    ],
  },
  {
    label: 'nav.groups.finance',
    items: [
      { label: 'nav.walletManagement', href: '/admin/finance/wallets', icon: 'wallet' },
      { label: 'nav.addBalance', href: '/admin/finance/add-balance', icon: 'moneyAdd' },
      { label: 'nav.withdrawalRequests', href: '/admin/finance/withdrawals', icon: 'moneySend' },
      { label: 'nav.transactions', href: '/admin/finance/transactions', icon: 'exchange' },
      { label: 'nav.sellerEarnings', href: '/admin/finance/earnings', icon: 'moneyBag' },
      { label: 'nav.platformRevenue', href: '/admin/finance/revenue', icon: 'trend' },
      { label: 'nav.expenses', href: '/admin/finance/expenses', icon: 'receipt' },
    ],
  },
  {
    label: 'nav.groups.support',
    items: [
      { label: 'nav.supportManagement', href: '/admin/support', icon: 'support', exact: true },
      { label: 'nav.telegramSupport', href: '/admin/support/telegram', icon: 'telegram' },
      { label: 'nav.telegramCommunity', href: '/admin/support/community', icon: 'users' },
    ],
  },
  {
    label: 'nav.groups.system',
    items: [
      { label: 'nav.generalSettings', href: '/admin/settings', icon: 'settings', exact: true },
      { label: 'nav.languageSettings', href: '/admin/settings/language', icon: 'language' },
      { label: 'nav.themeSettings', href: '/admin/settings/theme', icon: 'moon' },
      { label: 'nav.profileSettings', href: '/admin/settings/profile', icon: 'userCircle' },
    ],
  },
];
