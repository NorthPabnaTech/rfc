/**
 * Serializable shapes passed from server code to pages and client
 * components. Database documents never cross that boundary directly — the
 * services map them to these DTOs (string ids, ISO dates, no internals).
 */
import type {
  BannerPosition,
  ImageSourceType,
  NotificationType,
  OrderPlatform,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  ReturnStatus,
  ShippingZone,
  StockStatus,
  SupplierStatus,
  UserRole,
} from '@lib/constants';

export type ImageDTO = {
  type: ImageSourceType;
  url: string;
  publicId?: string;
  alt?: string;
  width?: number;
  height?: number;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

/* ─── Catalog ────────────────────────────────────────────────────────────── */

export type CategoryDTO = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId: string | null;
  image?: ImageDTO;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  productCount?: number;
};

export type CategoryTreeDTO = CategoryDTO & { children: CategoryDTO[] };

export type TagDTO = { id: string; name: string; slug: string; productCount?: number };

export type SupplierDTO = {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string;
  status: SupplierStatus;
  notes?: string;
  productCount?: number;
  createdAt: string;
};

export type ProductCardDTO = {
  id: string;
  name: string;
  slug: string;
  image?: ImageDTO;
  hoverImage?: ImageDTO;
  price: number;
  salePrice: number | null;
  effectivePrice: number;
  stockStatus: StockStatus;
  ratingAverage: number;
  ratingCount: number;
  categoryName?: string;
  hasVariations: boolean;
  isCombo: boolean;
  /** Number of distinct products in a combo (0 for single products). */
  comboCount: number;
};

export type ProductDetailDTO = ProductCardDTO & {
  shortDescription?: string;
  description?: string;
  images: ImageDTO[];
  sku?: string;
  variations: { name: string; values: string[] }[];
  specifications: { label: string; value: string }[];
  category: { id: string; name: string; slug: string } | null;
  subCategory: { id: string; name: string; slug: string } | null;
  tags: { id: string; name: string; slug: string }[];
  seo: { metaTitle?: string; metaDescription?: string; keywords: string[] };
  soldCount: number;
  /** Items in a combo, with their own current price for the savings display. */
  comboItems: {
    id: string;
    name: string;
    slug: string;
    image?: ImageDTO;
    quantity: number;
    price: number;
  }[];
};

export type AdminProductRowDTO = {
  id: string;
  name: string;
  slug: string;
  image?: ImageDTO;
  sku?: string;
  categoryName?: string;
  supplierName?: string;
  supplierPrice: number;
  price: number;
  salePrice: number | null;
  effectivePrice: number;
  stockStatus: StockStatus;
  status: ProductStatus;
  isFeatured: boolean;
  soldCount: number;
  updatedAt: string;
};

export type AdminProductDTO = {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  category: string;
  subCategory: string | null;
  tags: string[];
  supplier: string;
  supplierProductUrl?: string;
  supplierPrice: number;
  price: number;
  salePrice: number | null;
  stockStatus: StockStatus;
  sku?: string;
  images: ImageDTO[];
  variations: { name: string; values: string[] }[];
  specifications: { label: string; value: string }[];
  seo: { metaTitle?: string; metaDescription?: string; keywords: string[] };
  status: ProductStatus;
  isFeatured: boolean;
  isComboOffer: boolean;
};

/* ─── Promotions ───────────────────────────────────────────────────────── */

export type BannerDTO = {
  id: string;
  title: string;
  description?: string;
  eyebrow?: string;
  image: ImageDTO;
  ctaLabel?: string;
  link?: string;
  position: BannerPosition;
  isActive: boolean;
  sortOrder: number;
  startsAt?: string;
  endsAt?: string;
};

export type AdminComboDTO = {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  images: ImageDTO[];
  items: {
    productId: string;
    name: string;
    image?: string;
    price: number;
    supplierPrice: number;
    quantity: number;
  }[];
  /** Bundle price the customer pays. */
  comboPrice: number;
  /** Sum of the items' current prices (what buying separately costs). */
  regularPrice: number;
  supplierPrice: number;
  stockStatus: StockStatus;
  status: ProductStatus;
  isFeatured: boolean;
  soldCount: number;
  updatedAt: string;
};

/* ─── Orders ─────────────────────────────────────────────────────────────── */

export type AddressDTO = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine: string;
  division?: string;
  area?: string;
  city: string;
  zone: ShippingZone;
  isDefault: boolean;
};

export type OrderItemDTO = {
  id: string;
  productId: string;
  name: string;
  slug: string;
  image?: string;
  sku?: string;
  variant: Record<string, string>;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  /** Admin-only fields — stripped for customers. */
  supplierPrice?: number;
  supplierName?: string;
  supplierProductUrl?: string;
  /** Combo contents (admin only). */
  components?: {
    name: string;
    quantity: number;
    supplierName?: string;
    supplierProductUrl?: string;
  }[];
};

export type OrderDTO = {
  id: string;
  orderNumber: string;
  userId: string | null;
  customer: { name: string; phone: string; email?: string };
  shippingAddress: Omit<AddressDTO, 'id' | 'label' | 'isDefault'>;
  items: OrderItemDTO[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  supplierCost?: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  platform: OrderPlatform;
  status: OrderStatus;
  statusHistory: { status: OrderStatus; note?: string; at: string }[];
  customerNote?: string;
  adminNote?: string;
  cancelReason?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
  /** Customer-facing permissions, computed server-side. */
  canCancel?: boolean;
  canRequestReturn?: boolean;
  returnRequest?: ReturnDTO | null;
};

export type OrderRowDTO = Pick<
  OrderDTO,
  | 'id'
  | 'orderNumber'
  | 'customer'
  | 'total'
  | 'status'
  | 'platform'
  | 'paymentStatus'
  | 'createdAt'
> & { itemCount: number; city: string };

export type CartQuoteLine = {
  productId: string;
  name: string;
  slug: string;
  image?: ImageDTO;
  variant: Record<string, string>;
  /** The product's options, so a line added without them can be completed in the cart. */
  options: { name: string; values: string[] }[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  available: boolean;
  issue?: string;
};

export type CartQuote = {
  lines: CartQuoteLine[];
  subtotal: number;
  shippingFee: number;
  total: number;
  freeShippingThreshold: number;
};

/* ─── Engagement ─────────────────────────────────────────────────────────── */

export type ReviewDTO = {
  id: string;
  productId: string;
  productName?: string;
  productSlug?: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  images: ImageDTO[];
  isHidden: boolean;
  createdAt: string;
};

export type QuestionDTO = {
  id: string;
  productId: string;
  productName?: string;
  productSlug?: string;
  userName: string;
  question: string;
  answer?: string;
  answeredAt?: string;
  isHidden: boolean;
  createdAt: string;
};

export type ReturnDTO = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  reason: string;
  description?: string;
  images: ImageDTO[];
  status: ReturnStatus;
  adminNote?: string;
  refundAmount?: number;
  orderTotal?: number;
  createdAt: string;
  resolvedAt?: string;
};

/* ─── Users & settings ───────────────────────────────────────────────────── */

export type CustomerRowDTO = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  role: UserRole;
  orderCount: number;
  totalSpent: number;
  createdAt: string;
};

export type ProfileDTO = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: ImageDTO;
};

export type SettingsDTO = {
  storeName: string;
  tagline: string;
  supportPhone: string;
  supportEmail?: string;
  address: string;
  shippingFeeInsideDhaka: number;
  shippingFeeOutsideDhaka: number;
  freeShippingThreshold: number;
  announcement?: string;
  social: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    whatsapp?: string;
    youtube?: string;
  };
};

export type NotificationDTO = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  seen: boolean;
  read: boolean;
  createdAt: string;
};

/** What the bell needs: the latest notifications + the badge count. */
export type NotificationFeedDTO = { items: NotificationDTO[]; unseen: number };
