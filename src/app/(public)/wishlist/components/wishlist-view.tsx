'use client';

import * as React from 'react';
import Link from 'next/link';

import { productCardsAction } from '@/actions/catalog';
import { ProductGrid, ProductGridSkeleton } from '@/features/products/product-card';
import { useWishlist } from '@/stores/wishlist-store';
import type { ProductCardDTO } from '@/types';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { useHydrated } from '@hooks/use-hydrated';

/** Loads fresh prices/stock for the saved product ids. */
export function WishlistView() {
  const hydrated = useHydrated();
  const ids = useWishlist((s) => s.ids);
  const [loaded, setLoaded] = React.useState<{ key: string; items: ProductCardDTO[] } | null>(null);
  const key = ids.join(',');

  React.useEffect(() => {
    if (!hydrated || ids.length === 0) return;
    let cancelled = false;
    productCardsAction(ids).then((res) => {
      if (!cancelled && res.ok) setLoaded({ key, items: res.data });
    });
    return () => {
      cancelled = true;
    };
    // `key` captures the ids by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, key]);

  if (!hydrated || (ids.length > 0 && !loaded)) {
    return (
      <div className="mt-6">
        <ProductGridSkeleton count={5} />
      </div>
    );
  }

  // Keep the grid in sync with removals made on this page.
  const items = (loaded?.items ?? []).filter((p) => ids.includes(p.id));

  if (items.length === 0) {
    return (
      <div className="border-line mt-6 flex flex-col items-center rounded-2xl border bg-white px-6 py-16 text-center">
        <span className="bg-brand-soft text-brand-ink grid size-16 place-items-center rounded-full">
          <Icon name="heart" size={28} />
        </span>
        <h2 className="font-display text-ink mt-5 text-xl">Your wishlist is empty</h2>
        <p className="text-muted mt-2 text-sm">Tap the heart on any product to save it here.</p>
        <Button variant="noir" size="lg" asChild className="mt-6">
          <Link href="/products">Discover products</Link>
        </Button>
      </div>
    );
  }

  return <ProductGrid className="mt-6" products={items} priorityCount={0} />;
}
