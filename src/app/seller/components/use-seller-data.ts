'use client';

import * as React from 'react';

import { useResellerAuth } from '@/stores/reseller-auth';
import type { Availability, Category, SellerProduct } from '@/types/platform';
import {
  type DashboardData,
  type Paginated,
  resellerApi,
  type ResellerOrder,
  type ResellerProduct,
  type SupportTicket,
  type WalletSummaryData,
  type WalletTransaction,
} from '@lib/api/reseller';

export type MappedSellerProduct = SellerProduct & {
  sku?: string;
  shortDescription?: string;
  variations?: { name: string; values: string[] }[];
  specifications?: { label: string; value: string }[];
  stockQuantity?: number;
  deliveryCharges: { insideDhaka: number; outsideDhaka: number };
  categoryName?: string;
  categorySlug?: string;
};

export function mapResellerProduct(p: ResellerProduct): MappedSellerProduct {
  const availability: Availability =
    p.stockStatus === 'out_of_stock'
      ? 'out_of_stock'
      : p.stockStatus === 'limited'
        ? 'limited'
        : 'in_stock';
  return {
    id: p.id,
    name: p.name,
    nameBn: p.name,
    slug: p.slug,
    sku: p.sku,
    shortDescription: p.shortDescription,
    description: p.description ?? p.shortDescription ?? '',
    images: (p.images ?? []).map((img) => img.url).filter(Boolean),
    categoryId: p.category?.id ?? 'uncategorized',
    categoryName: p.category?.name,
    categorySlug: p.category?.slug,
    deliveryCharge: p.deliveryCharges?.insideDhaka ?? 0,
    packagingCharge: p.packagingCost ?? 0,
    deliveryCharges: {
      insideDhaka: p.deliveryCharges?.insideDhaka ?? 70,
      outsideDhaka: p.deliveryCharges?.outsideDhaka ?? 130,
    },
    status: availability === 'out_of_stock' ? 'out_of_stock' : 'active',
    availability,
    basePrice: p.resellerPrice ?? 0,
    suggestedPrice: p.suggestedRetailPrice ?? p.resellerPrice ?? 0,
    variations: p.variations
      ?.map((v) => ({
        name: v.name,
        values: v.values.filter((val) => !v.disabledValues?.includes(val)),
      }))
      .filter((v) => v.values.length > 0),
    specifications: p.specifications,
    stockQuantity: p.stockQuantity,
    createdAt: new Date().toISOString(),
  };
}

export function deriveCategories(products: ResellerProduct[]): Category[] {
  const map = new Map<string, Category>();
  for (const p of products) {
    if (!p.category) continue;
    if (!map.has(p.category.id)) {
      map.set(p.category.id, {
        id: p.category.id,
        name: p.category.name,
        nameBn: p.category.name,
        slug: p.category.slug,
        icon: 'box',
        description: p.category.name,
      });
    }
  }
  return Array.from(map.values());
}

export function useSellerCatalog() {
  const [raw, setRaw] = React.useState<ResellerProduct[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tick, setTick] = React.useState(0);

  const reload = React.useCallback(() => setTick((x) => x + 1), []);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    resellerApi
      .listProducts({ page: 1, limit: 100 })
      .then((res) => {
        if (!active) return;
        setRaw(res.data.items);
        setError(null);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load products');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tick]);

  const products = React.useMemo(() => raw.map(mapResellerProduct), [raw]);
  const categories = React.useMemo(() => deriveCategories(raw), [raw]);

  return { products, rawProducts: raw, categories, loading, error, reload };
}

export function useSellerProduct(slugOrId: string) {
  const [product, setProduct] = React.useState<MappedSellerProduct | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    resellerApi
      .getProduct(slugOrId)
      .then((res) => {
        if (!active) return;
        setProduct(mapResellerProduct(res.data));
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Product not found');
        setProduct(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slugOrId]);

  return { product, loading, error };
}

export function useSellerDashboard(days = 30) {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tick, setTick] = React.useState(0);

  const reload = React.useCallback(() => setTick((x) => x + 1), []);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    resellerApi
      .getDashboard(days)
      .then((d) => {
        if (!active) return;
        setData(d);
        setError(null);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [days, tick]);

  return { data, loading, error, reload };
}

export function useSellerWallet() {
  const reseller = useResellerAuth((s) => s.reseller);
  const [wallet, setWallet] = React.useState<WalletSummaryData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tick, setTick] = React.useState(0);

  const reload = React.useCallback(() => setTick((x) => x + 1), []);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    resellerApi
      .getWallet()
      .then((w) => {
        if (!active) return;
        setWallet(w);
        setError(null);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load wallet');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tick]);

  return {
    wallet: wallet ?? {
      walletBalance: reseller?.walletBalance ?? 0,
      totalDeposited: reseller?.totalDeposited ?? 0,
      totalWithdrawn: reseller?.totalWithdrawn ?? 0,
      totalProfitEarned: reseller?.totalProfitEarned ?? 0,
      minDeposit: 100,
      minWithdrawal: 50,
    },
    loading,
    error,
    reload,
  };
}

export function useSellerTransactions(params: {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
} = {}) {
  const [data, setData] = React.useState<Paginated<WalletTransaction>>({
    items: [],
    total: 0,
    page: 1,
    totalPages: 1,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tick, setTick] = React.useState(0);

  const { page = 1, limit = 20, type = '', status = '' } = params;
  const reload = React.useCallback(() => setTick((x) => x + 1), []);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    resellerApi
      .listTransactions({ page, limit, type, status })
      .then((res) => {
        if (!active) return;
        setData(res);
        setError(null);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load transactions');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, limit, type, status, tick]);

  return { ...data, loading, error, reload };
}

export function useSellerOrders(params: { page?: number; limit?: number; status?: string } = {}) {
  const [items, setItems] = React.useState<ResellerOrder[]>([]);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tick, setTick] = React.useState(0);

  const { page = 1, limit = 20, status = '' } = params;
  const reload = React.useCallback(() => setTick((x) => x + 1), []);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    resellerApi
      .listOrders({ page, limit, status })
      .then((res) => {
        if (!active) return;
        if (Array.isArray(res)) {
          setItems(res);
          setTotal(res.length);
          setTotalPages(1);
        } else {
          setItems(res.items ?? []);
          setTotal(res.total ?? 0);
          setTotalPages(res.totalPages ?? 1);
        }
        setError(null);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load orders');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, limit, status, tick]);

  return { orders: items, total, totalPages, loading, error, reload };
}

export function useSellerOrder(id: string) {
  const [order, setOrder] = React.useState<ResellerOrder | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tick, setTick] = React.useState(0);

  const reload = React.useCallback(() => setTick((x) => x + 1), []);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    resellerApi
      .getOrder(id)
      .then((o) => {
        if (!active) return;
        setOrder(o);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Order not found');
        setOrder(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, tick]);

  return { order, loading, error, reload };
}

export function useSellerTickets(status?: string) {
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tick, setTick] = React.useState(0);

  const reload = React.useCallback(() => setTick((x) => x + 1), []);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    resellerApi
      .listTickets(status)
      .then((res) => {
        if (!active) return;
        setTickets(Array.isArray(res) ? res : (res.items ?? []));
        setError(null);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load tickets');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status, tick]);

  return { tickets, loading, error, reload };
}
