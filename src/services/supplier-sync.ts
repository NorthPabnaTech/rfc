import 'server-only';

import { connectDB, ProductModel, SupplierModel } from '@/database';
import type {
  AdminProductDTO,
  SupplierCatalogProductDTO,
  SupplierCatalogVariantDTO,
} from '@/types';
import { AppError } from '@lib/errors';

import { getSupplierAdapter, isSupplierApiConfigured } from './suppliers/registry';
import type { SupplierProductsPage } from './suppliers/types';

type VariantDimension = 'Color' | 'Size';
type SyncedVariation = { name: string; values: string[]; disabledValues: string[] };

/**
 * Computes `{ values, disabledValues }` for a single variation dimension (`Color`
 * or `Size`) from supplier variants. A value is marked in `disabledValues` when
 * every supplier variant with that value has `inStock === false`, and re-enabled
 * automatically if any matching variant is `inStock === true`.
 */
function syncDimensionFromVariants(
  dimension: VariantDimension,
  extVariants: SupplierCatalogVariantDTO[],
  existing?: { name: string; values: string[]; disabledValues?: string[] },
): SyncedVariation | null {
  const key = dimension === 'Color' ? 'color' : 'size';
  // Map normalized lowercase value -> { label, hasInStock }
  const supplierMap = new Map<string, { label: string; hasInStock: boolean }>();

  for (const v of extVariants) {
    const raw = v[key]?.trim();
    if (!raw) continue;
    const norm = raw.toLowerCase();
    const prev = supplierMap.get(norm);
    if (prev) {
      if (v.inStock) prev.hasInStock = true;
    } else {
      supplierMap.set(norm, { label: raw, hasInStock: Boolean(v.inStock) });
    }
  }

  if (supplierMap.size === 0 && !existing) return null;

  // Preserve existing value order & casing, then append any new supplier values.
  const values: string[] = [];
  const seenNorms = new Set<string>();

  for (const val of existing?.values ?? []) {
    const trimmed = val.trim();
    if (!trimmed) continue;
    const norm = trimmed.toLowerCase();
    if (seenNorms.has(norm)) continue;
    seenNorms.add(norm);
    values.push(trimmed);
  }

  for (const [norm, info] of supplierMap) {
    if (!seenNorms.has(norm)) {
      seenNorms.add(norm);
      values.push(info.label);
    }
  }

  if (values.length === 0) return null;

  const existingDisabled = new Set(
    (existing?.disabledValues ?? []).map((d) => d.trim().toLowerCase()),
  );
  const disabledValues: string[] = [];

  for (const val of values) {
    const norm = val.toLowerCase();
    const sup = supplierMap.get(norm);
    if (supplierMap.size > 0) {
      // If the supplier provides values for this dimension, anything omitted or
      // marked out-of-stock by the supplier is disabled locally.
      if (!sup || !sup.hasInStock) disabledValues.push(val);
    } else if (existingDisabled.has(norm)) {
      disabledValues.push(val);
    }
  }

  return { name: dimension, values, disabledValues };
}

function buildSyncedVariations(
  extVariants: SupplierCatalogVariantDTO[],
  existingVariations: { name: string; values: string[]; disabledValues?: string[] }[] = [],
): SyncedVariation[] {
  if (extVariants.length === 0) {
    return existingVariations.map((v) => ({
      name: v.name,
      values: [...v.values],
      disabledValues: v.disabledValues ? [...v.disabledValues] : [],
    }));
  }

  const findExisting = (dim: VariantDimension) =>
    existingVariations.find((v) => v.name.trim().toLowerCase() === dim.toLowerCase());

  const colorRow = syncDimensionFromVariants('Color', extVariants, findExisting('Color'));
  const sizeRow = syncDimensionFromVariants('Size', extVariants, findExisting('Size'));

  const otherRows: SyncedVariation[] = existingVariations
    .filter((v) => {
      const lower = v.name.trim().toLowerCase();
      return lower !== 'color' && lower !== 'size';
    })
    .map((v) => ({
      name: v.name,
      values: [...v.values],
      disabledValues: v.disabledValues ? [...v.disabledValues] : [],
    }));

  const next: SyncedVariation[] = [];
  if (colorRow) next.push(colorRow);
  next.push(...otherRows);
  if (sizeRow) next.push(sizeRow);
  return next;
}

export async function fetchSupplierCatalog(
  supplierId: string,
  opts: { search?: string; page?: number; limit?: number } = {},
): Promise<SupplierProductsPage> {
  await connectDB();
  const supplier = await SupplierModel.findById(supplierId).lean();
  if (!supplier) throw new AppError('Supplier not found.', 404);
  if (supplier.type !== 'api' || !supplier.provider) {
    throw new AppError('This supplier is a manual supplier and has no API connection.', 400);
  }
  const adapter = getSupplierAdapter(supplier.provider);
  return adapter.fetchProducts(supplier, opts);
}

/**
 * Retrieves a single supplier product and maps it into initial ProductForm
 * values (saved as draft by default so admin can review & edit before publishing).
 */
export async function getSupplierImportDraft(
  supplierId: string,
  externalProductId: string,
): Promise<Partial<AdminProductDTO> & { supplierName?: string }> {
  await connectDB();
  const supplier = await SupplierModel.findById(supplierId).lean();
  if (!supplier || supplier.type !== 'api' || !supplier.provider) {
    throw new AppError('API supplier not found.', 404);
  }
  const adapter = getSupplierAdapter(supplier.provider);
  const { products, deliveryCharges } = await adapter.fetchAllProducts(supplier);
  const ext = products.find((p) => p.id === externalProductId);
  if (!ext) {
    throw new AppError('Selected product was not found in the supplier catalog.', 404);
  }

  const variations = buildSyncedVariations(ext.variants);

  return {
    name: ext.name,
    shortDescription: ext.description ? ext.description.slice(0, 300) : '',
    description: ext.description ?? '',
    supplier: String(supplier._id),
    supplierName: supplier.name,
    supplierProductId: ext.id,
    supplierProductUrl: ext.slug ? `${supplier.websiteUrl.replace(/\/+$/, '')}/products/${ext.slug}` : '',
    supplierPrice: ext.costPrice,
    supplierPackagingCost: ext.packagingCost,
    supplierMinSellingPrice: ext.minimumSellingPrice,
    supplierInStock: ext.inStock,
    supplierVariants: ext.variants.map((v) => ({
      externalVariantId: v.id,
      color: v.color,
      size: v.size,
      stockQuantity: v.stockQuantity,
      inStock: v.inStock,
    })),
    price: ext.suggestedPrice > 0 ? ext.suggestedPrice : ext.minimumSellingPrice.customerPaysDelivery,
    salePrice: null,
    stockStatus: ext.inStock ? 'in_stock' : 'out_of_stock',
    stockQuantity: ext.stockQuantity,
    trackInventory: false,
    images: ext.images.slice(0, 15).map((url) => ({
      type: 'external' as const,
      url,
      alt: ext.name,
    })),
    variations,
    status: 'draft',
    // Pass deliveryCharges via supplierMinSellingPrice / ProductForm context if needed
    ...(deliveryCharges ? {} : {}),
  };
}

export async function syncSupplierProducts(
  supplierId: string,
): Promise<{ updated: number; totalFetched: number }> {
  await connectDB();
  const supplier = await SupplierModel.findById(supplierId).lean();
  if (!supplier) throw new AppError('Supplier not found.', 404);
  if (supplier.type !== 'api' || !supplier.provider) {
    throw new AppError('Only API-connected suppliers can be synchronized.', 400);
  }
  if (!isSupplierApiConfigured(supplier)) {
    throw new AppError('Supplier API key is not configured.', 400);
  }

  const adapter = getSupplierAdapter(supplier.provider);
  let allProducts: SupplierCatalogProductDTO[] = [];
  let deliveryCharges: { insideDhaka: number; outsideDhaka: number } | undefined;

  try {
    const res = await adapter.fetchAllProducts(supplier);
    allProducts = res.products;
    deliveryCharges = res.deliveryCharges;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Supplier sync failed.';
    // Never mark local products out of stock on API failure!
    await SupplierModel.findByIdAndUpdate(supplier._id, {
      lastSyncAt: new Date(),
      lastSyncStatus: 'error',
      lastSyncError: message.slice(0, 1000),
    });
    throw err;
  }

  const byExtId = new Map(allProducts.map((p) => [p.id, p]));
  const linked = await ProductModel.find({
    supplier: supplier._id,
    supplierProductId: { $exists: true, $ne: null },
  });

  const now = new Date();
  let updated = 0;

  for (const local of linked) {
    if (!local.supplierProductId) continue;
    const ext = byExtId.get(local.supplierProductId);
    // Missing from supplier response: do not delete or falsely mark out of stock.
    if (!ext) continue;

    local.supplierInStock = ext.inStock;
    local.supplierLastSyncedAt = now;
    local.supplierPrice = ext.costPrice;
    local.supplierPackagingCost = ext.packagingCost;
    local.supplierMinSellingPrice = ext.minimumSellingPrice;
    local.supplierDeliveryCharges = ext.deliveryCharges;
    local.supplierVariants = ext.variants.map((v) => ({
      externalVariantId: v.id,
      color: v.color,
      size: v.size,
      stockQuantity: v.stockQuantity,
      inStock: v.inStock,
    }));
    local.stockQuantity = ext.stockQuantity;

    // Respect both supplier availability and local inventory tracking rules.
    if (!ext.inStock) {
      local.stockStatus = 'out_of_stock';
    } else if (local.trackInventory && (local.stockQuantity ?? 0) <= 0) {
      local.stockStatus = 'out_of_stock';
    } else {
      local.stockStatus = 'in_stock';
    }

    // Keep all Color / Size values and toggle disabledValues based on supplier stock.
    if (ext.variants.length > 0) {
      local.variations = buildSyncedVariations(ext.variants, local.variations);
    }

    await local.save();
    updated++;
  }

  await SupplierModel.findByIdAndUpdate(supplier._id, {
    lastSyncAt: now,
    lastSyncStatus: 'ok',
    lastSyncError: undefined,
    lastSyncUpdatedCount: updated,
    ...(deliveryCharges ? { deliveryCharges } : {}),
  });

  return { updated, totalFetched: allProducts.length };
}

export async function syncAllActiveSuppliers(): Promise<{
  syncedSuppliers: number;
  updated: number;
  totalFetched: number;
  errors: string[];
}> {
  await connectDB();
  const suppliers = await SupplierModel.find({
    status: 'active',
    type: 'api',
  }).lean();

  let syncedSuppliers = 0;
  let updated = 0;
  let totalFetched = 0;
  const errors: string[] = [];

  for (const s of suppliers) {
    if (!isSupplierApiConfigured(s)) continue;
    try {
      const res = await syncSupplierProducts(String(s._id));
      syncedSuppliers++;
      updated += res.updated;
      totalFetched += res.totalFetched;
    } catch (err) {
      errors.push(`${s.name}: ${err instanceof Error ? err.message : 'Sync error'}`);
    }
  }

  return { syncedSuppliers, updated, totalFetched, errors };
}

export async function syncDueSuppliers(): Promise<{ synced: number; errors: string[] }> {
  await connectDB();
  const suppliers = await SupplierModel.find({
    status: 'active',
    type: 'api',
    syncEnabled: true,
  }).lean();

  const now = Date.now();
  let synced = 0;
  const errors: string[] = [];

  for (const s of suppliers) {
    if (!isSupplierApiConfigured(s)) continue;
    const intervalMs = Math.max(5, s.syncIntervalMinutes ?? 30) * 60_000;
    const last = s.lastSyncAt ? new Date(s.lastSyncAt).getTime() : 0;
    if (last && now - last < intervalMs) continue;

    try {
      await syncSupplierProducts(String(s._id));
      synced++;
    } catch (err) {
      errors.push(`${s.name}: ${err instanceof Error ? err.message : 'Sync error'}`);
    }
  }

  return { synced, errors };
}
