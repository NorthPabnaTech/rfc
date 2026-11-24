import 'server-only';

import { cache } from 'react';
import { Types } from 'mongoose';

import { type Campaign, CampaignModel, connectDB, ProductModel } from '@/database';
import type { AppliedCampaignDTO, CampaignDTO, CampaignProductRef } from '@/types';
import { AppError } from '@lib/errors';
import type { CampaignParsed } from '@lib/validators/campaign';

type PopulatedProduct = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  price: number;
  salePrice?: number | null;
  images?: { url: string; publicId?: string; alt?: string; type?: 'cloudinary' | 'external' }[];
};

function toProductRef(p: PopulatedProduct): CampaignProductRef {
  const img = p.images?.[0];
  return {
    id: String(p._id),
    name: p.name,
    slug: p.slug,
    price: p.price,
    salePrice: p.salePrice ?? null,
    image: img
      ? {
          url: img.url,
          publicId: img.publicId,
          alt: img.alt,
          type: img.type ?? (img.publicId ? 'cloudinary' : 'external'),
        }
      : undefined,
  };
}

function toCampaignDTO(
  doc: Omit<Campaign, 'products'> & { products: (Types.ObjectId | PopulatedProduct)[] },
): CampaignDTO {
  const populated = (doc.products ?? []).filter(
    (p): p is PopulatedProduct => typeof p === 'object' && p !== null && 'name' in p,
  );
  const productIds = (doc.products ?? []).map((p) =>
    typeof p === 'object' && p !== null && '_id' in p ? String(p._id) : String(p),
  );

  return {
    id: String(doc._id),
    title: doc.title,
    description: doc.description ?? undefined,
    type: doc.type,
    couponCode: doc.couponCode ?? null,
    discountType: doc.discountType,
    discountValue: doc.discountValue,
    minOrderAmount: doc.minOrderAmount ?? 0,
    scope: doc.scope,
    productIds,
    products: populated.map(toProductRef),
    startsAt: new Date(doc.startsAt).toISOString(),
    endsAt: new Date(doc.endsAt).toISOString(),
    isActive: doc.isActive,
    showOnHome: doc.showOnHome ?? true,
    showModal: doc.showModal ?? true,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

function toApplied(c: Campaign): AppliedCampaignDTO {
  return {
    id: String(c._id),
    title: c.title,
    type: c.type,
    couponCode: c.couponCode ?? null,
    discountType: c.discountType,
    discountValue: c.discountValue,
  };
}

/** Currently running campaigns (isActive and within [startsAt, endsAt]). */
export const getActiveCampaigns = cache(async (): Promise<CampaignDTO[]> => {
  await connectDB();
  const now = new Date();
  const docs = await CampaignModel.find({
    isActive: true,
    startsAt: { $lte: now },
    endsAt: { $gte: now },
  })
    .sort({ endsAt: 1, createdAt: -1 })
    .populate('products', 'name slug price salePrice images')
    .lean();

  return docs.map((d) =>
    toCampaignDTO(d as unknown as Omit<Campaign, 'products'> & { products: PopulatedProduct[] }),
  );
});

export async function listAdminCampaigns(): Promise<CampaignDTO[]> {
  await connectDB();
  const docs = await CampaignModel.find()
    .sort({ createdAt: -1 })
    .populate('products', 'name slug price salePrice images')
    .lean();

  return docs.map((d) =>
    toCampaignDTO(d as unknown as Omit<Campaign, 'products'> & { products: PopulatedProduct[] }),
  );
}

export async function listCampaignProductOptions(): Promise<CampaignProductRef[]> {
  await connectDB();
  const docs = await ProductModel.find({}, 'name slug price salePrice images')
    .sort({ name: 1 })
    .lean();
  return docs.map((d) => toProductRef(d as unknown as PopulatedProduct));
}

export async function saveCampaign(input: CampaignParsed, id?: string): Promise<void> {
  await connectDB();

  if (input.type === 'coupon' && input.couponCode) {
    const existing = await CampaignModel.findOne({
      couponCode: input.couponCode,
      ...(id ? { _id: { $ne: id } } : {}),
    }).lean();
    if (existing) {
      throw new AppError(`Coupon code "${input.couponCode}" is already used by another campaign.`);
    }
  }

  const payload = {
    title: input.title,
    description: input.description || undefined,
    type: input.type,
    couponCode: input.type === 'coupon' ? input.couponCode : null,
    discountType: input.discountType,
    discountValue: input.discountValue,
    minOrderAmount: input.minOrderAmount ?? 0,
    scope: input.scope,
    products: input.scope === 'products' ? input.productIds.map((pid) => new Types.ObjectId(pid)) : [],
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    isActive: input.isActive,
    showOnHome: input.showOnHome,
    showModal: input.showModal,
  };

  if (id) {
    const doc = await CampaignModel.findById(id);
    if (!doc) throw new AppError('Campaign not found.', 404);
    doc.set(payload);
    await doc.save();
  } else {
    await CampaignModel.create(payload);
  }
}

export async function toggleCampaignActive(id: string, isActive: boolean): Promise<void> {
  await connectDB();
  const doc = await CampaignModel.findByIdAndUpdate(id, { isActive }, { new: true });
  if (!doc) throw new AppError('Campaign not found.', 404);
}

export async function deleteCampaign(id: string): Promise<void> {
  await connectDB();
  const res = await CampaignModel.findByIdAndDelete(id);
  if (!res) throw new AppError('Campaign not found.', 404);
}

export type DeliveryOffer = {
  type: 'none' | 'free' | 'half' | 'fixed';
  value: number;
};

export function computeDeliveryDiscountAmount(
  baseShipping: number,
  offer: DeliveryOffer,
): number {
  if (baseShipping <= 0 || offer.type === 'none') return 0;
  if (offer.type === 'free') return baseShipping;
  if (offer.type === 'half') return Math.round(baseShipping / 2);
  return Math.max(0, Math.min(baseShipping, offer.value));
}

function toDeliveryOffer(c: Campaign): DeliveryOffer {
  if (c.discountType === 'free_delivery') return { type: 'free', value: 0 };
  if (c.discountType === 'half_delivery') return { type: 'half', value: 0 };
  if (c.discountType === 'delivery_discount') return { type: 'fixed', value: c.discountValue };
  return { type: 'none', value: 0 };
}

function deliveryOfferRank(offer: DeliveryOffer): number {
  if (offer.type === 'free') return 1_000_000;
  if (offer.type === 'half') return 500_000;
  if (offer.type === 'fixed') return offer.value;
  return 0;
}

export async function calculateCampaignDiscount(
  lines: Array<{ productId: string; lineTotal: number; available: boolean }>,
  couponCode?: string | null,
): Promise<{
  discount: number;
  freeDelivery: boolean;
  deliveryOffer: DeliveryOffer;
  appliedCampaign: AppliedCampaignDTO | null;
  couponError: string | null;
}> {
  await connectDB();
  const now = new Date();
  const active = await CampaignModel.find({
    isActive: true,
    startsAt: { $lte: now },
    endsAt: { $gte: now },
  }).lean();

  const availableLines = lines.filter((l) => l.available);
  if (availableLines.length === 0) {
    return {
      discount: 0,
      freeDelivery: false,
      deliveryOffer: { type: 'none', value: 0 },
      appliedCampaign: null,
      couponError: null,
    };
  }

  const totalSubtotal = availableLines.reduce((s, l) => s + l.lineTotal, 0);

  const evaluate = (c: Campaign) => {
    const eligibleLines =
      c.scope === 'all'
        ? availableLines
        : availableLines.filter((l) => c.products.some((pid) => String(pid) === l.productId));
    if (eligibleLines.length === 0) {
      return {
        hasEligible: false,
        minNotMet: false,
        discount: 0,
        deliveryOffer: { type: 'none', value: 0 } as DeliveryOffer,
      };
    }
    const eligibleSubtotal = eligibleLines.reduce((s, l) => s + l.lineTotal, 0);
    if ((c.minOrderAmount ?? 0) > 0 && totalSubtotal < c.minOrderAmount) {
      return {
        hasEligible: true,
        minNotMet: true,
        discount: 0,
        deliveryOffer: { type: 'none', value: 0 } as DeliveryOffer,
      };
    }
    const deliveryOffer = toDeliveryOffer(c);
    if (deliveryOffer.type !== 'none') {
      return {
        hasEligible: true,
        minNotMet: false,
        discount: 0,
        deliveryOffer,
      };
    }
    const raw =
      c.discountType === 'percentage'
        ? Math.round((eligibleSubtotal * c.discountValue) / 100)
        : Math.min(c.discountValue, eligibleSubtotal);
    return {
      hasEligible: true,
      minNotMet: false,
      discount: Math.max(0, Math.min(raw, eligibleSubtotal)),
      deliveryOffer: { type: 'none', value: 0 } as DeliveryOffer,
    };
  };

  const normalizedCoupon = couponCode?.trim().toUpperCase();
  if (normalizedCoupon) {
    const match = active.find((c) => c.type === 'coupon' && c.couponCode === normalizedCoupon);
    if (!match) {
      return {
        discount: 0,
        freeDelivery: false,
        deliveryOffer: { type: 'none', value: 0 },
        appliedCampaign: null,
        couponError: 'Invalid or expired coupon code.',
      };
    }
    const res = evaluate(match);
    if (!res.hasEligible) {
      return {
        discount: 0,
        freeDelivery: false,
        deliveryOffer: { type: 'none', value: 0 },
        appliedCampaign: null,
        couponError: 'This coupon does not apply to the items in your cart.',
      };
    }
    if (res.minNotMet) {
      return {
        discount: 0,
        freeDelivery: false,
        deliveryOffer: { type: 'none', value: 0 },
        appliedCampaign: null,
        couponError: `Minimum order of ৳${match.minOrderAmount} required for this coupon.`,
      };
    }
    return {
      discount: res.discount,
      freeDelivery: res.deliveryOffer.type === 'free',
      deliveryOffer: res.deliveryOffer,
      appliedCampaign: toApplied(match),
      couponError: null,
    };
  }

  // Automatic offer: pick the active 'offer' campaign giving the highest product discount,
  // and also the best active 'offer' granting a delivery discount.
  let best: { campaign: Campaign; discount: number } | null = null;
  let bestDelivery: { campaign: Campaign; offer: DeliveryOffer } | null = null;
  for (const c of active) {
    if (c.type !== 'offer') continue;
    const res = evaluate(c);
    if (
      res.deliveryOffer.type !== 'none' &&
      (!bestDelivery || deliveryOfferRank(res.deliveryOffer) > deliveryOfferRank(bestDelivery.offer))
    ) {
      bestDelivery = { campaign: c, offer: res.deliveryOffer };
    }
    if (res.discount > 0 && (!best || res.discount > best.discount)) {
      best = { campaign: c, discount: res.discount };
    }
  }

  const deliveryOffer = bestDelivery?.offer ?? { type: 'none', value: 0 };

  if (best) {
    return {
      discount: best.discount,
      freeDelivery: deliveryOffer.type === 'free',
      deliveryOffer,
      appliedCampaign: toApplied(best.campaign),
      couponError: null,
    };
  }

  if (bestDelivery) {
    return {
      discount: 0,
      freeDelivery: deliveryOffer.type === 'free',
      deliveryOffer,
      appliedCampaign: toApplied(bestDelivery.campaign),
      couponError: null,
    };
  }

  return {
    discount: 0,
    freeDelivery: false,
    deliveryOffer: { type: 'none', value: 0 },
    appliedCampaign: null,
    couponError: null,
  };
}
