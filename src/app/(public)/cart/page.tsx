import type { Metadata } from 'next';

import { CartView } from './components/cart-view';

export const metadata: Metadata = { title: 'Your cart', robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-page py-10">
      <h1 className="type-display text-ink mb-8">Your cart</h1>
      <CartView />
    </div>
  );
}
