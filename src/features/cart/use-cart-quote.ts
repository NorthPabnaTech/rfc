'use client';

import * as React from 'react';

import { quoteCartAction } from '@/actions/checkout';
import type { CartItem } from '@/stores/cart-store';
import type { CartQuote } from '@/types';
import type { ShippingZone } from '@lib/constants';

/**
 * Live server pricing for the cart (current prices, stock, delivery fee).
 * Re-quotes whenever the lines or delivery zone change; `loading` is derived
 * from whether the latest quote matches the current cart.
 */
export function useCartQuote(items: CartItem[], zone?: ShippingZone, enabled = true) {
  const [result, setResult] = React.useState<{ signature: string; quote: CartQuote } | null>(null);
  const signature = JSON.stringify([items.map((i) => [i.productId, i.quantity, i.variant]), zone]);
  const active = enabled && items.length > 0;

  React.useEffect(() => {
    if (!active) return;
    let cancelled = false;
    quoteCartAction({
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        variant: i.variant,
      })),
      zone,
    }).then((res) => {
      if (!cancelled && res.ok) setResult({ signature, quote: res.data });
    });
    return () => {
      cancelled = true;
    };
    // `signature` captures items + zone by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, active]);

  return {
    // Keep showing the previous quote while a new one loads (no flash).
    quote: active ? (result?.quote ?? null) : null,
    loading: active && result?.signature !== signature,
  };
}
