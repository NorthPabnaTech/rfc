import 'server-only';

import { connectDB, ProductModel, SupplierModel } from '@/database';
import type { AdminProductDTO, SupplierCatalogProductDTO } from '@/types';
import { AppError } from '@lib/errors';

import { getSupplierAdapter, isSupplierApiConfigured } from './suppliers/registry';
import type { SupplierProductsPage } from './suppliers/types';

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

  const colors = [
    ...new Set(ext.variants.map((v) => v.color).filter((c): c is string => Boolean(c?.trim()))),
  ];
  const sizes = [
    ...new Set(ext.variants.map((v) => v.size).filter((s): s is string => Boolean(s?.trim()))),
  ];
  const variations: { name: string; values: string[] }[] = [];
  if (colors.length) variations.push({ name: 'Color', values: colors });
  if (sizes.length) variations.push({ name: 'Size', values: sizes });

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

    // Respect both supplier availability and local inventory tracking rules.
    if (!ext.inStock) {
      local.stockStatus = 'out_of_stock';
    } else if (local.trackInventory && (local.stockQuantity ?? 0) <= 0) {
      local.stockStatus = 'out_of_stock';
    } else {
      local.stockStatus = 'in_stock';
    }

    // Update Color / Size variation options to only expose in-stock variants when variants exist.
    if (ext.variants.length > 0) {
      const availableVariants = ext.variants.filter((v) => v.inStock);
      const colors = [
        ...new Set(
          availableVariants.map((v) => v.color).filter((c): c is string => Boolean(c?.trim())),
        ),
      ];
      const sizes = [
        ...new Set(
          availableVariants.map((v) => v.size).filter((s): s is string => Boolean(s?.trim())),
        ),
      ];
      const nextVariations = local.variations.filter(
        (v) => v.name !== 'Color' && v.name !== 'Size',
      );
      if (colors.length) nextVariations.unshift({ name: 'Color', values: colors });
      if (sizes.length) nextVariations.push({ name: 'Size', values: sizes });
      if (colors.length || sizes.length) {
        local.variations = nextVariations;
      }
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
