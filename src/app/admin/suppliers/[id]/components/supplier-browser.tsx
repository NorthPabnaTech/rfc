'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';

import { fetchSupplierCatalogAction, syncSupplierProductsAction } from '@/actions/admin';
import { Taka } from '@/features/products/price';
import { ProductImage } from '@/features/products/product-image';
import type { SupplierCatalogProductDTO, SupplierDTO } from '@/types';
import { Icon } from '@components/icon/icon';
import { Callout, EmptyState, Spinner, StatCard, StatCardGrid, StatusBadge } from '@components/shared';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { toast } from '@lib/toast';
import { formatStoreDateTime } from '@lib/utils';

type Props = {
  supplier: SupplierDTO;
  initialCatalog?: {
    products: SupplierCatalogProductDTO[];
    total: number;
    page: number;
    totalPages: number;
    deliveryCharges?: { insideDhaka: number; outsideDhaka: number };
  };
  initialError?: string;
  linkedExternalIds: string[];
};

export function SupplierBrowser({
  supplier,
  initialCatalog,
  initialError,
  linkedExternalIds,
}: Props) {
  const router = useRouter();
  const [products, setProducts] = React.useState<SupplierCatalogProductDTO[]>(
    initialCatalog?.products ?? [],
  );
  const [page, setPage] = React.useState(initialCatalog?.page ?? 1);
  const [totalPages, setTotalPages] = React.useState(initialCatalog?.totalPages ?? 1);
  const [total, setTotal] = React.useState(initialCatalog?.total ?? 0);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>(initialError);

  const linkedSet = React.useMemo(() => new Set(linkedExternalIds), [linkedExternalIds]);

  const loadCatalog = async (nextPage: number, q: string) => {
    setLoading(true);
    setError(undefined);
    const res = await fetchSupplierCatalogAction({
      supplierId: supplier.id,
      search: q.trim() || undefined,
      page: nextPage,
    });
    setLoading(false);
    if (!res.ok || !res.data) {
      const msg = res.ok ? 'Failed to load supplier catalog.' : res.error;
      setError(msg);
      toast.error(msg);
      return;
    }
    setProducts(res.data.products);
    setPage(res.data.page);
    setTotalPages(res.data.totalPages);
    setTotal(res.data.total);
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    const res = await syncSupplierProductsAction(supplier.id);
    setSyncing(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      `Synced ${res.data?.updated ?? 0} linked product(s) from ${res.data?.totalFetched ?? 0} catalog items`,
    );
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Integration Monitoring */}
      <StatCardGrid>
        <StatCard
          label="Connection"
          value={supplier.apiKeyConfigured ? 'Connected' : 'Missing Key'}
          hint={
            supplier.apiKeyEnvVar
              ? `Env: ${supplier.apiKeyEnvVar}`
              : 'Configure env var on server'
          }
          tone={supplier.apiKeyConfigured ? 'ok' : 'danger'}
        />
        <StatCard
          label="Last Product Sync"
          value={supplier.lastSyncAt ? formatStoreDateTime(supplier.lastSyncAt) : 'Never'}
          hint={
            supplier.lastSyncStatus === 'error'
              ? supplier.lastSyncError || 'Last sync failed'
              : supplier.lastSyncUpdatedCount != null
                ? `${supplier.lastSyncUpdatedCount} linked product(s) updated`
                : 'Click Sync Now to update stock'
          }
          tone={supplier.lastSyncStatus === 'error' ? 'danger' : 'neutral'}
        />
        <StatCard
          label="Linked Products"
          value={String(supplier.linkedProductCount ?? 0)}
          hint={`${supplier.productCount ?? 0} total from this supplier`}
        />
        <StatCard
          label="Supplier Orders"
          value={String(supplier.submittedOrderCount ?? 0)}
          hint={`${supplier.pendingOrderCount ?? 0} awaiting · ${supplier.failedOrderCount ?? 0} failed`}
          tone={(supplier.failedOrderCount ?? 0) > 0 ? 'warn' : 'neutral'}
        />
      </StatCardGrid>

      <div className="bg-surface hairline flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
        <div className="space-y-0.5 text-sm">
          <p className="text-ink font-semibold">Stock Synchronization & Orders</p>
          <p className="text-subtle text-xs">
            Auto-sync runs every {supplier.syncIntervalMinutes ?? 30} min when{' '}
            {supplier.syncEnabled ? 'enabled' : 'paused'}.
            {supplier.deliveryCharges &&
              ` · Supplier delivery: Inside Dhaka ৳${supplier.deliveryCharges.insideDhaka}, Outside Dhaka ৳${supplier.deliveryCharges.outsideDhaka}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href={`/admin/suppliers/orders?supplier=${supplier.id}`}>
              View Supplier Orders
            </Link>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSyncNow}
            disabled={syncing || !supplier.apiKeyConfigured}
          >
            <Icon name="refresh" size={14} className={syncing ? 'animate-spin' : undefined} />
            {syncing ? 'Syncing Stock…' : 'Sync Stock Now'}
          </Button>
        </div>
      </div>

      {supplier.lastSyncStatus === 'error' && supplier.lastSyncError && (
        <Callout tone="danger" title="Last synchronization failed">
          {supplier.lastSyncError} — Existing local stock was preserved safely.
        </Callout>
      )}

      {/* Supplier Product Browser */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-ink text-base font-bold">Supplier Product Browser</h2>
            <p className="text-subtle text-xs">
              Browse {total} products from {supplier.name} and selectively import into your store as
              drafts.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void loadCatalog(1, search);
            }}
            className="flex gap-2"
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search supplier products…"
              className="input-flat h-9 w-60 px-3 text-sm"
            />
            <Button type="submit" variant="secondary" size="sm" disabled={loading}>
              <Icon name="search" size={14} /> Search
            </Button>
          </form>
        </div>

        {error && (
          <Callout tone="danger" title="Could not load supplier catalog">
            {error}
          </Callout>
        )}

        {loading ? (
          <div className="grid place-items-center py-16">
            <Spinner size="md" />
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title="No supplier products found"
            description="Try a different search keyword or check your supplier API configuration."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {products.map((p) => {
              const isImported = linkedSet.has(p.id);
              return (
                <div
                  key={p.id}
                  className="bg-surface hairline flex flex-col justify-between gap-4 rounded-2xl p-4"
                >
                  <div className="flex gap-4">
                    <div className="bg-well size-24 shrink-0 overflow-hidden rounded-xl">
                      <ProductImage
                        src={p.images[0]}
                        alt={p.name}
                        width={160}
                        height={160}
                        className="size-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-ink line-clamp-2 text-sm font-bold">{p.name}</h3>
                        <StatusBadge
                          status={p.inStock ? 'ok' : 'danger'}
                          label={p.inStock ? `In stock (${p.stockQuantity})` : 'Out of stock'}
                        />
                      </div>
                      {p.description && (
                        <p className="text-muted line-clamp-2 text-xs">{p.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {p.category && <Badge tone="neutral">{p.category}</Badge>}
                        {isImported && <Badge tone="brand">Already Imported</Badge>}
                        <span className="text-subtle text-[11px]">ID: {p.id.slice(0, 8)}…</span>
                      </div>
                    </div>
                  </div>

                  {/* Admin-only pricing & minimum selling rules */}
                  <div className="bg-well grid grid-cols-2 gap-2 rounded-xl p-3 text-xs sm:grid-cols-4">
                    <div>
                      <span className="text-subtle block">Cost Price</span>
                      <Taka amount={p.costPrice} className="text-ink font-semibold" />
                    </div>
                    <div>
                      <span className="text-subtle block">Packaging</span>
                      <Taka amount={p.packagingCost} className="text-ink font-semibold" />
                    </div>
                    <div>
                      <span className="text-subtle block">Suggested</span>
                      <Taka amount={p.suggestedPrice} className="text-ink font-semibold" />
                    </div>
                    <div>
                      <span className="text-subtle block">Delivery (Dhk/Out)</span>
                      <span className="text-ink font-semibold">
                        ৳{p.deliveryCharges.insideDhaka} / ৳{p.deliveryCharges.outsideDhaka}
                      </span>
                    </div>
                    <div className="col-span-2 border-t border-black/5 pt-2 sm:col-span-4">
                      <span className="text-subtle">Min Selling Price: </span>
                      <span className="text-ink font-medium">
                        Customer pays delivery ৳{p.minimumSellingPrice.customerPaysDelivery} ·
                        Reseller Dhaka ৳{p.minimumSellingPrice.resellerPaysDeliveryInsideDhaka} ·
                        Reseller Outside ৳{p.minimumSellingPrice.resellerPaysDeliveryOutsideDhaka}
                      </span>
                    </div>
                  </div>

                  {p.variants.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {p.variants.map((v) => (
                        <span
                          key={v.id}
                          className="bg-well text-ink rounded-md px-2 py-0.5 text-[11px]"
                        >
                          {[v.color, v.size].filter(Boolean).join(' / ') || 'Variant'} (
                          {v.inStock ? v.stockQuantity : 'Out'})
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 border-t border-black/5 pt-3">
                    <Button asChild size="sm" variant={isImported ? 'secondary' : 'primary'}>
                      <Link
                        href={`/admin/products/new?supplierId=${supplier.id}&externalProductId=${encodeURIComponent(p.id)}`}
                      >
                        <Icon name="plus" size={14} />
                        {isImported ? 'Import Again' : 'Import / Add Product'}
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-black/5 pt-4 text-sm">
            <span className="text-subtle">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={page <= 1 || loading}
                onClick={() => void loadCatalog(page - 1, search)}
              >
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={page >= totalPages || loading}
                onClick={() => void loadCatalog(page + 1, search)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
