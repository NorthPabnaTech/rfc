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
  'completed',
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
  delivered: ['completed'],
  completed: [],
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
  other: 'Other',
};

export const PAYMENT_METHODS = ['cod'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: 'Cash on Delivery',
};

export const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

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

/* ─── Notifications ──────────────────────────────────────────────────────── */

/**
 * `order_placed` / `order_cancelled` go to every admin; `order_status` goes to
 * the customer who owns the order (guest orders have nobody to notify).
 */
export const NOTIFICATION_TYPES = ['order_placed', 'order_cancelled', 'order_status'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** How many recent notifications the bell loads. */
export const NOTIFICATION_LIST_LIMIT = 20;
/** Without realtime (no Pusher keys) the bell re-checks this often. */
export const NOTIFICATION_POLL_MS = 30_000;
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

/** Cloudinary folders, one per upload purpose. */
export const UPLOAD_FOLDERS = {
  products: 'RFC-Gadget/products',
  users: 'RFC-Gadget/users',
  reviews: 'RFC-Gadget/reviews',
  returns: 'RFC-Gadget/returns',
  categories: 'RFC-Gadget/categories',
  banners: 'RFC-Gadget/banners',
} as const;
export type UploadPurpose = keyof typeof UPLOAD_FOLDERS;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export const PAGE_SIZE = 24;
export const ADMIN_PAGE_SIZE = 10;
