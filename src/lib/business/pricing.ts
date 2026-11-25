import type { Product, PublicProduct, SellerProduct } from '@/types/platform';

/**
 * Pricing rules (single source of truth for the UI; Phase 2 repeats them on
 * the server, which never trusts a client-sent price).
 *
 *   Seller Base Price = Supplier Cost + Platform Margin
 *   Seller Profit     = (Seller Selling Price − Seller Base Price) × Quantity
 */
export function sellerBasePrice(p: Pick<Product, 'supplierCost' | 'platformMargin'>): number {
  return p.supplierCost + p.platformMargin;
}

export function sellerProfit(sellingPrice: number, basePrice: number, quantity = 1): number {
  return (sellingPrice - basePrice) * quantity;
}

/** Profit as a percentage of the base price (for hints). */
export function profitPercent(sellingPrice: number, basePrice: number): number {
  if (basePrice <= 0) return 0;
  return ((sellingPrice - basePrice) / basePrice) * 100;
}

export type PriceCheck = 'ok' | 'below_base' | 'equal_base' | 'empty';

export function checkSellingPrice(sellingPrice: number | undefined, basePrice: number): PriceCheck {
  if (!sellingPrice || sellingPrice <= 0) return 'empty';
  if (sellingPrice < basePrice) return 'below_base';
  if (sellingPrice === basePrice) return 'equal_base';
  return 'ok';
}

/** Strip admin-only fields: what a signed-in seller may see. */
export function toSellerProduct(p: Product): SellerProduct {
  return {
    id: p.id,
    name: p.name,
    nameBn: p.nameBn,
    slug: p.slug,
    description: p.description,
    images: p.images,
    categoryId: p.categoryId,
    deliveryCharge: p.deliveryCharge,
    packagingCharge: p.packagingCharge,
    status: p.status,
    availability: p.availability,
    suggestedPrice: p.suggestedPrice,
    createdAt: p.createdAt,
    basePrice: sellerBasePrice(p),
  };
}

/** Strip every price: what a public visitor may see. */
export function toPublicProduct(p: Product): PublicProduct {
  return {
    id: p.id,
    name: p.name,
    nameBn: p.nameBn,
    slug: p.slug,
    images: p.images,
    categoryId: p.categoryId,
    availability: p.availability,
  };
}
