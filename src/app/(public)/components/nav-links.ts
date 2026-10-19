/** Store-wide navigation shared by the desktop nav bar and the mobile menu. */
export const NAV_LINKS: { href: string; label: string; accent?: boolean }[] = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Shop' },
  { href: '/products?sort=newest', label: 'New arrivals' },
  { href: '/products?onSale=1', label: 'Hot deals', accent: true },
  { href: '/combo-offers', label: 'Combo offers', accent: true },
  { href: '/products?sort=popular', label: 'Best sellers' },
];
