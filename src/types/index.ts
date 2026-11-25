/**
 * Serializable shapes passed from server code to pages and client
 * components. Database documents never cross that boundary directly — the
 * services map them to these DTOs (string ids, ISO dates, no internals).
 */
import type {
  BannerPosition,
  DiscountType,
  ExpensePaymentMethod,
  ImageSourceType,
  NotificationType,
  OrderPlatform,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductDeliveryDiscountType,
  ProductStatus,
  ProductVisibility,
  ReturnStatus,
  ShippingZone,
  StockMovementType,
  StockStatus,
  SupplierOrderStatus,
  SupplierProvider,
  SupplierStatus,
  SupplierType,
  UploadPurpose,
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
  type: SupplierType;
  provider?: SupplierProvider;
  apiBaseUrl?: string;
  apiKeyEnvVar?: string;
  apiDomain?: string;
  apiKeyConfigured?: boolean;
  syncEnabled?: boolean;
  syncIntervalMinutes?: number;
  lastSyncAt?: string;
  lastSyncStatus?: 'ok' | 'error';
  lastSyncError?: string;
  lastSyncUpdatedCount?: number;
  deliveryCharges?: { insideDhaka: number; outsideDhaka: number };
  notes?: string;
  productCount?: number;
  linkedProductCount?: number;
  pendingOrderCount?: number;
  submittedOrderCount?: number;
  failedOrderCount?: number;
  createdAt: string;
};

export type SupplierCatalogVariantDTO = {
  id: string;
  color: string | null;
  size: string | null;
  stockQuantity: number;
  inStock: boolean;
};

export type SupplierCatalogProductDTO = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  category?: string;
  images: string[];
  suggestedPrice: number;
  suggestedPriceMin?: number;
  suggestedPriceMax?: number;
  costPrice: number;
  packagingCost: number;
  minimumSellingPrice: {
    customerPaysDelivery: number;
    resellerPaysDeliveryInsideDhaka: number;
    resellerPaysDeliveryOutsideDhaka: number;
  };
  deliveryCharges: {
    insideDhaka: number;
    outsideDhaka: number;
  };
  stockQuantity: number;
  inStock: boolean;
  variants: SupplierCatalogVariantDTO[];
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
  variations: { name: string; values: string[]; disabledValues?: string[] }[];
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
  resellerEnabled?: boolean;
  resellerProfit?: number;
  resellerPackagingCost?: number;
  price: number;
  salePrice: number | null;
  effectivePrice: number;
  stockStatus: StockStatus;
  stockQuantity: number;
  trackInventory: boolean;
  business: string;
  visibility: ProductVisibility;
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
  supplierProductId?: string;
  supplierPackagingCost?: number;
  supplierMinSellingPrice?: {
    customerPaysDelivery: number;
    resellerPaysDeliveryInsideDhaka: number;
    resellerPaysDeliveryOutsideDhaka: number;
  };
  supplierInStock?: boolean;
  supplierLastSyncedAt?: string;
  supplierVariants?: {
    externalVariantId: string;
    color?: string | null;
    size?: string | null;
    stockQuantity: number;
    inStock: boolean;
  }[];
  supplierPrice: number;
  resellerEnabled?: boolean;
  resellerProfit?: number;
  resellerPackagingCost?: number;
  price: number;
  salePrice: number | null;
  stockStatus: StockStatus;
  stockQuantity: number;
  trackInventory: boolean;
  business: string;
  visibility: ProductVisibility;
  sku?: string;
  images: ImageDTO[];
  variations: { name: string; values: string[]; disabledValues?: string[] }[];
  specifications: { label: string; value: string }[];
  seo: { metaTitle?: string; metaDescription?: string; keywords: string[] };
  status: ProductStatus;
  isFeatured: boolean;
  isComboOffer: boolean;
  freeDelivery: boolean;
  deliveryDiscountType: ProductDeliveryDiscountType;
  deliveryDiscountValue: number;
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

export type ReturnedOrderItemDTO = {
  orderItemId: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  supplierPrice: number;
  lineTotal: number;
  restocked: boolean;
};

export type OrderDTO = {
  id: string;
  orderNumber: string;
  invoiceNumber: string;
  business: string;
  userId: string | null;
  customer: { name: string; phone: string; email?: string };
  shippingAddress: Omit<AddressDTO, 'id' | 'label' | 'isDefault'>;
  items: OrderItemDTO[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  supplierCost?: number;
  resellerSummary?: {
    resellerPriceTotal: number;
    resellerSellingTotal: number;
    deliveryCharge: number;
    packagingCost: number;
    upfrontDeducted: number;
    expectedResellerProfit: number;
    profitCredited: boolean;
    upfrontRefunded: boolean;
    deliveryPaymentMode?: 'with_product' | 'advance';
    codAmount?: number;
    codCollected?: number;
    profitCreditedAmount?: number;
  };
  refundedAmount?: number;
  returnedItems?: ReturnedOrderItemDTO[];
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  gatewayTransactionId?: string | null;
  gatewayPaymentMethod?: string | null;
  paymentReference?: string | null;
  paidAt?: string | null;
  platform: OrderPlatform;
  status: OrderStatus;
  statusHistory: { status: OrderStatus; note?: string; at: string; byName?: string }[];
  customerNote?: string;
  adminNote?: string;
  cancelReason?: string;
  deliveredAt?: string;
  returnedAt?: string;
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
  | 'invoiceNumber'
  | 'business'
  | 'customer'
  | 'total'
  | 'status'
  | 'platform'
  | 'paymentMethod'
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

export type AppliedCampaignDTO = {
  id: string;
  title: string;
  type: 'offer' | 'coupon';
  couponCode?: string | null;
  discountType: DiscountType;
  discountValue: number;
};

export type CartQuote = {
  lines: CartQuoteLine[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  freeShippingThreshold: number;
  appliedCampaign?: AppliedCampaignDTO | null;
  couponError?: string | null;
};

export type CampaignProductRef = {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice?: number | null;
  image?: ImageDTO;
};

export type CampaignDTO = {
  id: string;
  title: string;
  description?: string;
  type: 'offer' | 'coupon';
  couponCode?: string | null;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  scope: 'all' | 'products';
  productIds: string[];
  products: CampaignProductRef[];
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  showOnHome: boolean;
  showModal: boolean;
  createdAt: string;
  updatedAt: string;
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
  totalProfit: number;
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
  whatsappEnabled: boolean;
  whatsappProductEnabled: boolean;
  whatsappDefaultMessage: string;
  social: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    whatsapp?: string;
    youtube?: string;
  };
  resellerWithdrawalFeeTiers: { minAmount: number; fee: number }[];
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

/* ─── Multi-business, Inventory, Expenses & Analytics ────────────────────── */

export type BusinessDTO = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  invoicePrefix: string;
  phone?: string;
  address?: string;
  logo?: ImageDTO;
  isPublicStorefront: boolean;
  isActive: boolean;
  productCount?: number;
  orderCount?: number;
  createdAt: string;
};

export type StockMovementDTO = {
  id: string;
  productId: string;
  productName: string;
  business: string;
  type: StockMovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  notes?: string;
  orderId?: string | null;
  orderNumber?: string;
  date: string;
  performedByName?: string;
};

export type ExpenseCategoryDTO = {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
  isCostOfGoods: boolean;
  expenseCount?: number;
};

export type ExpenseDTO = {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  isCostOfGoods: boolean;
  amount: number;
  expenseDate: string;
  paymentMethod: ExpensePaymentMethod;
  description?: string;
  attachment?: ImageDTO | null;
  business: string;
  createdByName?: string;
  createdAt: string;
};

export type AnalysisPeriod = 'all' | 'today' | 'week' | 'month' | 'year' | 'date' | 'custom';

export type AnalysisDashboardDTO = {
  range: { from: string; to: string; granularity: 'day' | 'month' };
  business: string;
  summary: {
    grossRevenue: number;
    discounts: number;
    refunds: number;
    netRevenue: number;
    shippingFees: number;
    cogs: number;
    grossProfit: number;
    operatingExpenses: number;
    supplierPurchaseExpenses: number;
    netProfit: number;
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    returnedOrders: number;
    averageOrderValue: number;
  };
  timeline: {
    label: string;
    key: string;
    revenue: number;
    expenses: number;
    cogs: number;
    profit: number;
    orders: number;
  }[];
  ordersByStatus: { status: OrderStatus; count: number; revenue: number }[];
  expenseByCategory: {
    categoryId: string;
    categoryName: string;
    isCostOfGoods: boolean;
    amount: number;
    count: number;
  }[];
  businessBreakdown: {
    slug: string;
    name: string;
    revenue: number;
    cogs: number;
    expenses: number;
    netProfit: number;
    orders: number;
  }[];
  platformBreakdown?: {
    platform: string;
    label: string;
    orders: number;
    revenue: number;
  }[];
};

export type MediaAssetDTO = {
  id: string;
  filename: string;
  url: string;
  publicId: string;
  mimeType: string;
  format?: string;
  bytes: number;
  width?: number;
  height?: number;
  purpose: UploadPurpose;
  uploadedByName?: string;
  createdAt: string;
};

export type MediaReferenceDTO = {
  kind: 'Product' | 'Category' | 'Banner' | 'Expense' | 'User' | 'Reseller' | 'Review' | 'Return';
  id: string;
  label: string;
};

export type SupplierOrderEventDTO = {
  status: SupplierOrderStatus;
  note?: string;
  at: string;
  byName?: string;
};

export type SupplierOrderDTO = {
  id: string;
  orderId: string;
  orderNumber: string;
  orderItemId: string;
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  supplierProvider?: SupplierProvider;
  externalProductId: string;
  externalVariantId?: string;
  variantLabel?: string;
  quantity: number;
  customer: {
    name: string;
    phone: string;
    address: string;
    division: string;
    district: string;
    area: string;
  };
  customerNote?: string;
  sellingPrice: number;
  costPrice: number;
  packagingCost: number;
  deliveryCharge: number;
  deliveryChargePaidByCustomer: boolean;
  deliveryChargePaidUpfront: boolean;
  expectedProfit: number;
  status: SupplierOrderStatus;
  externalOrderId?: string;
  externalStatus?: string;
  paymentStatus?: string;
  isDuplicate?: boolean;
  allowDuplicate?: boolean;
  confirmedByName?: string;
  confirmedAt?: string;
  submittedAt?: string;
  lastSyncedAt?: string;
  lastError?: string;
  lastResponseSummary?: Record<string, unknown>;
  statusHistory: SupplierOrderEventDTO[];
  createdAt: string;
  updatedAt: string;
};
