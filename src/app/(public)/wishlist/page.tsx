import type { Metadata } from 'next';

import { WishlistView } from './components/wishlist-view';

export const metadata: Metadata = { title: 'My wishlist', robots: { index: false } };

export default function WishlistPage() {
  return (
    <div className="bg-surface">
      <div className="container-page py-8">
        <h1 className="type-display text-ink">My wishlist</h1>
        <p className="text-muted mt-1 text-sm">Products you’ve saved for later.</p>
        <WishlistView />
      </div>
    </div>
  );
}
