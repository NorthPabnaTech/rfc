import 'server-only';

import { Types } from 'mongoose';

import type {
  Address,
  Banner,
  Category,
  ImageAsset,
  Order,
  Product,
  Question,
  ReturnRequest,
  Review,
  Supplier,
  Tag,
} from '@/database';
import type {
  AddressDTO,
  AdminProductDTO,
  AdminProductRowDTO,
  BannerDTO,
  CategoryDTO,
  ImageDTO,
  OrderDTO,
  ProductCardDTO,
  QuestionDTO,
  ReturnDTO,
  ReviewDTO,
  SupplierDTO,
  TagDTO,
} from '@/types';

type Id = Types.ObjectId | string;
const id = (v: Id | null | undefined): string => (v ? String(v) : '');
const iso = (d: Date | string | undefined | null): string => (d ? new Date(d).toISOString() : '');

/** A populated ref is an object with a name; an unpopulated one is just an ObjectId. */
type MaybePopulated<T> = Id | (T & { _id: Id }) | null | undefined;
function populated<T extends object>(v: MaybePopulated<T>): (T & { _id: Id }) | null {
  return v && typeof v === 'object' && !(v instanceof Types.ObjectId) && '_id' in v
    ? (v as T & { _id: Id })
    : null;
}

export function toImage(img: ImageAsset | undefined | null): ImageDTO | undefined {
  if (!img?.url) return undefined;
  return {
    type: img.type,
    url: img.url,
    publicId: img.publicId,
    alt: img.alt,
    width: img.width,
    height: img.height,
  };
}

export function toCategory(c: Category & { productCount?: number }): CategoryDTO {
  return {
    id: id(c._id),
    name: c.name,
    slug: c.slug,
    description: c.description,
    parentId: c.parent ? id(c.parent) : null,
    image: toImage(c.image),
    isActive: c.isActive,
    isFeatured: c.isFeatured,
    sortOrder: c.sortOrder,
    productCount: c.productCount,
  };
}

export function toTag(t: Tag & { productCount?: number }): TagDTO {
  return { id: id(t._id), name: t.name, slug: t.slug, productCount: t.productCount };
}

export function toSupplier(s: Supplier & { productCount?: number }): SupplierDTO {
  return {
    id: id(s._id),
    name: s.name,
    slug: s.slug,
    websiteUrl: s.websiteUrl,
    status: s.status,
    notes: s.notes,
    productCount: s.productCount,
    createdAt: iso(s.createdAt),
  };
}

type ProductWithRefs = Omit<Product, 'category' | 'subCategory' | 'supplier' | 'tags'> & {
  category: MaybePopulated<{ name: string; slug: string }>;
  subCategory?: MaybePopulated<{ name: string; slug: string }>;
  supplier: MaybePopulated<{ name: string }>;
  tags: MaybePopulated<{ name: string; slug: string }>[];
};

export function toProductCard(p: ProductWithRefs): ProductCardDTO {
  return {
    id: id(p._id),
    name: p.name,
    slug: p.slug,
    image: toImage(p.images[0]),
    hoverImage: toImage(p.images[1]),
    price: p.price,
    salePrice: p.salePrice ?? null,
    effectivePrice: p.effectivePrice,
    stockStatus: p.stockStatus,
    ratingAverage: p.ratingAverage,
    ratingCount: p.ratingCount,
    categoryName: p.type === 'combo' ? 'Combo offer' : populated(p.category)?.name,
    hasVariations: p.variations.some((v) => v.values.length > 0),
    isCombo: p.type === 'combo',
    comboCount: p.type === 'combo' ? (p.comboItems?.length ?? 0) : 0,
  };
}

export function toAdminProductRow(p: ProductWithRefs): AdminProductRowDTO {
  return {
    id: id(p._id),
    name: p.name,
    slug: p.slug,
    image: toImage(p.images[0]),
    sku: p.sku,
    categoryName: populated(p.category)?.name,
    supplierName: populated(p.supplier)?.name,
    supplierPrice: p.supplierPrice,
    price: p.price,
    salePrice: p.salePrice ?? null,
    effectivePrice: p.effectivePrice,
    stockStatus: p.stockStatus,
    status: p.status,
    isFeatured: p.isFeatured,
    soldCount: p.soldCount,
    updatedAt: iso(p.updatedAt),
  };
}

export function toAdminProduct(p: Product): AdminProductDTO {
  return {
    id: id(p._id),
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription,
    description: p.description,
    category: p.category ? id(p.category) : '',
    subCategory: p.subCategory ? id(p.subCategory) : null,
    tags: p.tags.map(id),
    supplier: p.supplier ? id(p.supplier) : '',
    supplierProductUrl: p.supplierProductUrl,
    supplierPrice: p.supplierPrice,
    price: p.price,
    salePrice: p.salePrice ?? null,
    stockStatus: p.stockStatus,
    sku: p.sku,
    images: p.images.map(toImage).filter((i): i is ImageDTO => !!i),
    variations: p.variations.map((v) => ({ name: v.name, values: [...v.values] })),
    specifications: p.specifications.map((s) => ({ label: s.label, value: s.value })),
    seo: {
      metaTitle: p.seo?.metaTitle,
      metaDescription: p.seo?.metaDescription,
      keywords: [...(p.seo?.keywords ?? [])],
    },
    status: p.status,
    isFeatured: p.isFeatured,
    isComboOffer: p.isComboOffer ?? false,
  };
}

export { populated };

export function toBanner(b: Banner): BannerDTO {
  return {
    id: id(b._id),
    title: b.title,
    description: b.description,
    eyebrow: b.eyebrow,
    image: toImage(b.image)!,
    ctaLabel: b.ctaLabel,
    link: b.link,
    position: b.position,
    isActive: b.isActive,
    sortOrder: b.sortOrder,
    startsAt: b.startsAt ? iso(b.startsAt) : undefined,
    endsAt: b.endsAt ? iso(b.endsAt) : undefined,
  };
}

export function toAddress(a: Address): AddressDTO {
  return {
    id: id(a._id),
    label: a.label,
    fullName: a.fullName,
    phone: a.phone,
    addressLine: a.addressLine,
    area: a.area,
    city: a.city,
    zone: a.zone,
    isDefault: a.isDefault,
  };
}

function variantToRecord(v: unknown): Record<string, string> {
  if (!v) return {};
  if (v instanceof Map) return Object.fromEntries(v as Map<string, string>);
  return { ...(v as Record<string, string>) };
}

export function toOrder(o: Order, { admin }: { admin: boolean }): OrderDTO {
  return {
    id: id(o._id),
    orderNumber: o.orderNumber,
    userId: o.user ? id(o.user) : null,
    customer: { name: o.customer.name, phone: o.customer.phone, email: o.customer.email },
    shippingAddress: {
      fullName: o.shippingAddress.fullName,
      phone: o.shippingAddress.phone,
      addressLine: o.shippingAddress.addressLine,
      area: o.shippingAddress.area,
      city: o.shippingAddress.city,
      zone: o.shippingAddress.zone,
    },
    items: o.items.map((i) => ({
      id: id(i._id),
      productId: id(i.product),
      name: i.name,
      slug: i.slug,
      image: i.image,
      sku: i.sku,
      variant: variantToRecord(i.variant),
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
      ...(admin
        ? {
            supplierPrice: i.supplierPrice,
            supplierName: i.supplierName,
            supplierProductUrl: i.supplierProductUrl,
            components: (i.components ?? []).map((c) => ({
              name: c.name,
              quantity: c.quantity,
              supplierName: c.supplierName,
              supplierProductUrl: c.supplierProductUrl,
            })),
          }
        : {}),
    })),
    subtotal: o.subtotal,
    shippingFee: o.shippingFee,
    discount: o.discount,
    total: o.total,
    ...(admin ? { supplierCost: o.supplierCost, adminNote: o.adminNote } : {}),
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    platform: o.platform,
    status: o.status,
    statusHistory: o.statusHistory.map((e) => ({ status: e.status, note: e.note, at: iso(e.at) })),
    customerNote: o.customerNote,
    cancelReason: o.cancelReason,
    deliveredAt: o.deliveredAt ? iso(o.deliveredAt) : undefined,
    createdAt: iso(o.createdAt),
    updatedAt: iso(o.updatedAt),
  };
}

type UserRef = MaybePopulated<{ name: string; avatar?: ImageAsset; phone?: string }>;
type ProductRef = MaybePopulated<{ name: string; slug: string }>;

export function toReview(
  r: Omit<Review, 'user' | 'product'> & { user: UserRef; product: ProductRef },
): ReviewDTO {
  const user = populated(r.user);
  const product = populated(r.product);
  return {
    id: id(r._id),
    productId: product ? id(product._id) : id(r.product as Id),
    productName: product?.name,
    productSlug: product?.slug,
    userName: user?.name ?? 'Customer',
    userAvatar: user?.avatar?.url,
    rating: r.rating,
    comment: r.comment,
    images: r.images.map(toImage).filter((i): i is ImageDTO => !!i),
    isHidden: r.isHidden,
    createdAt: iso(r.createdAt),
  };
}

export function toQuestion(
  q: Omit<Question, 'user' | 'product'> & { user: UserRef; product: ProductRef },
): QuestionDTO {
  const user = populated(q.user);
  const product = populated(q.product);
  return {
    id: id(q._id),
    productId: product ? id(product._id) : id(q.product as Id),
    productName: product?.name,
    productSlug: product?.slug,
    userName: user?.name ?? 'Customer',
    question: q.question,
    answer: q.answer,
    answeredAt: q.answeredAt ? iso(q.answeredAt) : undefined,
    isHidden: q.isHidden,
    createdAt: iso(q.createdAt),
  };
}

export function toReturn(
  r: Omit<ReturnRequest, 'user' | 'order'> & {
    user: UserRef;
    order: MaybePopulated<{ total: number; customer: { name: string; phone: string } }>;
  },
): ReturnDTO {
  const order = populated(r.order);
  return {
    id: id(r._id),
    orderId: order ? id(order._id) : id(r.order as Id),
    orderNumber: r.orderNumber,
    customerName: order?.customer.name ?? populated(r.user)?.name,
    customerPhone: order?.customer.phone,
    reason: r.reason,
    description: r.description,
    images: r.images.map(toImage).filter((i): i is ImageDTO => !!i),
    status: r.status,
    adminNote: r.adminNote,
    refundAmount: r.refundAmount,
    orderTotal: order?.total,
    createdAt: iso(r.createdAt),
    resolvedAt: r.resolvedAt ? iso(r.resolvedAt) : undefined,
  };
}

export { id as toId, iso as toIso };
