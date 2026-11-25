/**
 * Domain constants shared by the server (models, validation, business rules)
 * and the client (labels, filters, badges). Keep this file free of server-only
 * imports so client components can use it.
 */

/* ─── Orders ─────────────────────────────────────────────────────────────── */

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'returned',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

/** The happy-path flow, in order. Used for the tracking timeline. */
export const ORDER_FLOW: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
];

/**
 * Which statuses an admin may move an order to from its current status.
 * Forward one step along the flow, plus cancellation until the parcel ships.
 * `returned` is set only by the return-request workflow.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  completed: [],
  cancelled: [],
  returned: [],
};

/**
 * Flexible admin transitions: authorized admins can move an order to any
 * appropriate status, including cancelling or returning previously confirmed,
 * processing, shipped, or delivered orders.
 */
export const ADMIN_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
  confirmed: ['processing', 'shipped', 'delivered', 'cancelled'],
  processing: ['shipped', 'delivered'],
  shipped: ['delivered', 'returned'],
  delivered: ['returned'],
  completed: ['returned'],
  cancelled: [],
  returned: [],
};

/** Customers may cancel only before the order is confirmed. */
export const CUSTOMER_CANCELLABLE_STATUSES: OrderStatus[] = ['pending'];

export const ORDER_PLATFORMS = [
  'website',
  'facebook',
  'messenger',
  'instagram',
  'tiktok',
  'whatsapp',
  'reseller',
  'other',
] as const;
export type OrderPlatform = (typeof ORDER_PLATFORMS)[number];

export const ORDER_PLATFORM_LABELS: Record<OrderPlatform, string> = {
  website: 'Website',
  facebook: 'Facebook',
  messenger: 'Messenger',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
  reseller: 'Reseller',
  other: 'Other',
};

export const PAYMENT_METHODS = ['cod', 'paymently'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: 'Cash on Delivery',
  paymently: 'Pay Online',
};

export const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  unpaid: ['paid'],
  paid: ['refunded'],
  refunded: [],
};

export const SHIPPING_ZONES = ['inside_dhaka', 'outside_dhaka'] as const;
export type ShippingZone = (typeof SHIPPING_ZONES)[number];
export const SHIPPING_ZONE_LABELS: Record<ShippingZone, string> = {
  inside_dhaka: 'Inside Dhaka',
  outside_dhaka: 'Outside Dhaka',
};

/**
 * Delivery zone rule: only Dhaka city thanas (`DHAKA_CITY_AREAS` in
 * lib/locations.ts) inside this district are "Inside Dhaka". Dhaka district's
 * outer upazilas (Savar, Keraniganj…) and every other district are outside.
 */
export const INSIDE_DHAKA_DISTRICT = 'Dhaka';

/* ─── Returns ────────────────────────────────────────────────────────────── */

/** A return may be requested within this many hours of delivery (7 days). */
export const RETURN_WINDOW_HOURS = 7 * 24;

export const RETURN_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'picked_up',
  'refunded',
  'closed',
] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  picked_up: 'Picked up',
  refunded: 'Refunded',
  closed: 'Closed',
};

export const RETURN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  pending: ['approved', 'rejected'],
  approved: ['picked_up', 'refunded', 'closed'],
  picked_up: ['refunded', 'closed'],
  refunded: ['closed'],
  rejected: [],
  closed: [],
};

export const RETURN_REASONS = [
  'Damaged product',
  'Wrong item received',
  'Size or fit issue',
  'Not as described',
  'Quality issue',
  'Other',
] as const;

/* ─── Catalog ────────────────────────────────────────────────────────────── */

export const STOCK_STATUSES = ['in_stock', 'out_of_stock', 'pre_order'] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];
export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: 'In stock',
  out_of_stock: 'Out of stock',
  pre_order: 'Pre-order',
};

/** A "combo" product is a bundle of other products sold at one bundle price. */
export const PRODUCT_TYPES = ['single', 'combo'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_STATUSES = ['draft', 'published'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_VISIBILITIES = ['public', 'private'] as const;
export type ProductVisibility = (typeof PRODUCT_VISIBILITIES)[number];
export const PRODUCT_VISIBILITY_LABELS: Record<ProductVisibility, string> = {
  public: 'Public (Visible on website)',
  private: 'Private (Admin only)',
};

export const DEFAULT_BUSINESS_SLUG = 'rfc_gadget';

export const STOCK_MOVEMENT_TYPES = [
  'stock_in',
  'stock_out',
  'order_out',
  'order_cancel',
  'order_return',
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];
export const STOCK_MOVEMENT_LABELS: Record<StockMovementType, string> = {
  stock_in: 'Stock In',
  stock_out: 'Stock Out',
  order_out: 'Order Placed',
  order_cancel: 'Order Cancelled',
  order_return: 'Order Returned',
};

export const STOCK_ADJUSTMENT_REASONS = [
  'New inventory purchase',
  'Supplier restock',
  'Damaged / defective',
  'Lost / missing',
  'Internal use / sample',
  'Inventory audit correction',
  'Other',
] as const;

export const EXPENSE_PAYMENT_METHODS = ['cash', 'bkash', 'nagad', 'bank', 'card', 'other'] as const;
export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number];
export const EXPENSE_PAYMENT_METHOD_LABELS: Record<ExpensePaymentMethod, string> = {
  cash: 'Cash',
  bkash: 'bKash',
  nagad: 'Nagad',
  bank: 'Bank Transfer',
  card: 'Card',
  other: 'Other',
};

export const SUPPLIER_STATUSES = ['active', 'inactive'] as const;
export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

export const IMAGE_SOURCE_TYPES = ['cloudinary', 'external'] as const;
export type ImageSourceType = (typeof IMAGE_SOURCE_TYPES)[number];

export const PRODUCT_SORTS = ['newest', 'price_asc', 'price_desc', 'popular', 'rating'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];
export const PRODUCT_SORT_LABELS: Record<ProductSort, string> = {
  newest: 'Newest',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  popular: 'Best selling',
  rating: 'Top rated',
};

/* ─── Promotions ─────────────────────────────────────────────────────────── */

/** Where a promotional banner is displayed. */
export const BANNER_POSITIONS = ['hero', 'hero_side', 'special', 'combo'] as const;
export type BannerPosition = (typeof BANNER_POSITIONS)[number];
export const BANNER_POSITION_LABELS: Record<BannerPosition, string> = {
  hero: 'Homepage hero slider',
  hero_side: 'Homepage hero side cards',
  special: 'Homepage special offer banner',
  combo: 'Combo offers page',
};
export const BANNER_POSITION_HINTS: Record<BannerPosition, string> = {
  hero: 'Large rotating banners at the top of the homepage. Wide image, ~1600×640.',
  hero_side: 'Up to 2 small promo cards beside the slider. ~800×640.',
  special: 'Wide campaign banner in the middle of the homepage. ~1600×480.',
  combo: 'Header banner on the Combo Offers page. ~1600×480.',
};

/* ─── Campaigns & Coupons ────────────────────────────────────────────────── */

export const CAMPAIGN_TYPES = ['offer', 'coupon'] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export const DISCOUNT_TYPES = [
  'percentage',
  'fixed',
  'free_delivery',
  'half_delivery',
  'delivery_discount',
] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const PRODUCT_DELIVERY_DISCOUNT_TYPES = ['none', 'free', 'half', 'fixed'] as const;
export type ProductDeliveryDiscountType = (typeof PRODUCT_DELIVERY_DISCOUNT_TYPES)[number];

export const CAMPAIGN_SCOPES = ['all', 'products'] as const;
export type CampaignScope = (typeof CAMPAIGN_SCOPES)[number];

/* ─── Notifications ──────────────────────────────────────────────────────── */

/**
 * `order_placed` / `order_cancelled` go to every admin; `order_status` goes to
 * the customer who owns the order (guest orders have nobody to notify).
 */
export const NOTIFICATION_TYPES = [
  'order_placed',
  'order_cancelled',
  'order_status',
  'new_review',
  'new_question',
  'question_answered',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** How many recent notifications the bell loads. */
export const NOTIFICATION_LIST_LIMIT = 20;
/** Without realtime (no Pusher keys) the bell re-checks this often. */
export const NOTIFICATION_POLL_MS = 10_000;
/** Pusher event name for a new notification on a user's private channel. */
export const NOTIFICATION_EVENT = 'notification:new';
/** Played when a new notification arrives (file in /public). */
export const NOTIFICATION_SOUND = '/notification.mp3';

/* ─── Users & uploads ────────────────────────────────────────────────────── */

export const USER_ROLES = ['customer', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** A password-reset link works once, for this many minutes. */
export const PASSWORD_RESET_TTL_MINUTES = 30;
/** Ignore repeat reset requests for the same account within this window. */
export const PASSWORD_RESET_COOLDOWN_SECONDS = 60;
/** An email-verification link expires after this many hours. */
export const EMAIL_VERIFICATION_TTL_HOURS = 24;

/** Cloudinary folders, one per upload purpose. */
export const UPLOAD_FOLDERS = {
  products: 'RFC-Gadget/products',
  users: 'RFC-Gadget/users',
  reviews: 'RFC-Gadget/reviews',
  returns: 'RFC-Gadget/returns',
  categories: 'RFC-Gadget/categories',
  banners: 'RFC-Gadget/banners',
  expenses: 'RFC-Gadget/expenses',
} as const;
export type UploadPurpose = keyof typeof UPLOAD_FOLDERS;

/* ─── Supplier Integrations & Dropshipping ──────────────────────────────── */

export const SUPPLIER_TYPES = ['manual', 'api'] as const;
export type SupplierType = (typeof SUPPLIER_TYPES)[number];
export const SUPPLIER_TYPE_LABELS: Record<SupplierType, string> = {
  manual: 'Manual',
  api: 'API-connected',
};

export const SUPPLIER_PROVIDERS = ['business_koro'] as const;
export type SupplierProvider = (typeof SUPPLIER_PROVIDERS)[number];
export const SUPPLIER_PROVIDER_LABELS: Record<SupplierProvider, string> = {
  business_koro: 'Business Koro',
};

export const SUPPLIER_ORDER_STATUSES = [
  'awaiting_confirmation',
  'submitted',
  'pending_payment',
  'processing',
  'shipped',
  'delivered',
  'failed',
  'cancelled',
] as const;
export type SupplierOrderStatus = (typeof SUPPLIER_ORDER_STATUSES)[number];
export const SUPPLIER_ORDER_STATUS_LABELS: Record<SupplierOrderStatus, string> = {
  awaiting_confirmation: 'Awaiting Admin Confirmation',
  submitted: 'Submitted to Supplier',
  pending_payment: 'Pending Payment',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const HEIC_IMAGE_TYPES = [
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
];
export const ACCEPTED_IMAGE_EXTENSIONS_ATTR = 'image/*,.heic,.heif';

export function isHeicFile(file: { name: string; type: string }): boolean {
  const mime = file.type.toLowerCase();
  if (HEIC_IMAGE_TYPES.includes(mime)) return true;
  return /\.(heic|heif)$/i.test(file.name);
}

export function isAcceptedImageFile(file: { name: string; type: string }): boolean {
  const mime = file.type.toLowerCase();
  return ACCEPTED_IMAGE_TYPES.includes(mime) || isHeicFile(file);
}

export const PAGE_SIZE = 24;
export const ADMIN_PAGE_SIZE = 10;

/* ─── Resellers & Wallet ─────────────────────────────────────────────────── */

export const MIN_RESELLER_DEPOSIT = 100;
export const MIN_RESELLER_WITHDRAWAL = 50;
/**
 * A reseller's selling price may be at most this many times the reseller
 * price. Stops absurd prices that would inflate profit credited on delivery.
 */
export const RESELLER_MAX_SELLING_MULTIPLIER = 5;
/** Largest quantity of one line on a reseller order. */
export const RESELLER_MAX_LINE_QUANTITY = 100;

/**
 * `with_product`: the courier collects the delivery charge together with the
 * product price (COD = selling total + delivery).
 * `advance`: the customer already paid the delivery charge to the reseller,
 * so the courier collects only the selling total.
 */
export const RESELLER_DELIVERY_PAYMENT_MODES = ['with_product', 'advance'] as const;
export type ResellerDeliveryPaymentMode = (typeof RESELLER_DELIVERY_PAYMENT_MODES)[number];

/**
 * One withdrawal fee tier: `fee` applies to withdrawals of at least
 * `minAmount`. The tier with the highest matching `minAmount` wins.
 */
export type ResellerWithdrawalFeeTier = { minAmount: number; fee: number };

/** Fee for withdrawing `amount`, from the admin-configured tiers. */
export function resellerWithdrawalFee(
  amount: number,
  tiers: readonly ResellerWithdrawalFeeTier[] | undefined,
): number {
  let fee = 0;
  let best = -Infinity;
  for (const t of tiers ?? []) {
    if (amount >= t.minAmount && t.minAmount > best) {
      best = t.minAmount;
      fee = t.fee;
    }
  }
  return Math.max(0, fee);
}

/**
 * Env vars a supplier record may name as its API key. Only supplier keys:
 * an admin must never be able to point a supplier at e.g. `AUTH_SECRET` or
 * `MONGODB_URI` and have it sent to an arbitrary host.
 */
export const SUPPLIER_API_KEY_ENV_PATTERN = /^(BUSINESS_KORO|SUPPLIER)_[A-Z0-9_]*API_KEY$/;

/* ─── Abuse protection ───────────────────────────────────────────────────── */

/** Fixed-window limits: at most `limit` attempts per `windowSeconds`. */
export const RATE_LIMITS = {
  /** Per IP and per account identifier (brute force). */
  login: { limit: 10, windowSeconds: 15 * 60 },
  register: { limit: 5, windowSeconds: 60 * 60 },
  /** Per IP and per email (mail bombing). */
  forgotPassword: { limit: 5, windowSeconds: 60 * 60 },
  /** Per IP: fake COD orders lock stock and fill the supplier queue. */
  placeOrder: { limit: 10, windowSeconds: 60 * 60 },
  /** Per IP: order numbers are sequential, so phones must not be guessable. */
  trackOrder: { limit: 20, windowSeconds: 15 * 60 },
  /** Per user: Cloudinary quota. */
  upload: { limit: 60, windowSeconds: 60 * 60 },
  /** Reseller API, per IP. */
  resellerAuth: { limit: 10, windowSeconds: 15 * 60 },
} as const satisfies Record<string, { limit: number; windowSeconds: number }>;
export type RateLimitBucket = keyof typeof RATE_LIMITS;

export const WALLET_TX_TYPES = [
  'deposit',
  'withdrawal',
  'order_deduction',
  'order_profit',
  'order_refund',
  'admin_adjustment',
] as const;
export type WalletTxType = (typeof WALLET_TX_TYPES)[number];

export const WALLET_TX_TYPE_LABELS: Record<WalletTxType, string> = {
  deposit: 'Add Balance',
  withdrawal: 'Withdrawal',
  order_deduction: 'Order Delivery & Packaging',
  order_profit: 'Order Profit',
  order_refund: 'Order Refund',
  admin_adjustment: 'Admin Adjustment',
};

export const WALLET_TX_STATUSES = ['pending', 'completed', 'rejected', 'failed'] as const;
export type WalletTxStatus = (typeof WALLET_TX_STATUSES)[number];
export const WALLET_TX_STATUS_LABELS: Record<WalletTxStatus, string> = {
  pending: 'Pending',
  completed: 'Completed',
  rejected: 'Rejected',
  failed: 'Failed',
};

export const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const TICKET_STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_progress', 'resolved', 'closed'],
  in_progress: ['resolved', 'closed'],
  resolved: [],
  closed: [],
};

export const TICKET_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
