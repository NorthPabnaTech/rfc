'use client';

import * as React from 'react';

import { useCurrentSeller, usePlatformStore } from '@/stores/platform-store';
import { toSellerProduct } from '@lib/business/pricing';

/**
 * Seller-safe catalog: drafts hidden, supplier cost / margin / supplier
 * stripped by `toSellerProduct` before anything reaches seller components.
 */
export function useSellerCatalog() {
  const products = usePlatformStore((s) => s.products);
  const categories = usePlatformStore((s) => s.categories);
  const list = React.useMemo(
    () => products.filter((p) => p.status !== 'draft').map(toSellerProduct),
    [products],
  );
  return { products: list, categories };
}

/** The current seller's own orders, transactions, earnings and withdrawals. */
export function useSellerRecords() {
  const seller = useCurrentSeller();
  const id = seller?.id;
  const orders = usePlatformStore((s) => s.orders);
  const transactions = usePlatformStore((s) => s.transactions);
  const earnings = usePlatformStore((s) => s.earnings);
  const withdrawals = usePlatformStore((s) => s.withdrawals);
  return React.useMemo(
    () => ({
      seller,
      orders: orders.filter((o) => o.sellerId === id),
      transactions: transactions.filter((x) => x.sellerId === id),
      earnings: earnings.filter((x) => x.sellerId === id),
      withdrawals: withdrawals.filter((x) => x.sellerId === id),
    }),
    [seller, id, orders, transactions, earnings, withdrawals],
  );
}
