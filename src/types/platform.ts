/**
 * Domain types for the reseller platform (Phase 1 — mock data).
 * Ids are strings, dates are ISO strings, money is whole Taka (number).
 * The same shapes will be returned by the Phase 2 API.
 */

export type Role = 'admin' | 'seller';

export type ProductStatus = 'active' | 'draft' | 'out_of_stock';
export type Availability = 'in_stock' | 'limited' | 'out_of_stock';

export type Category = {
  id: string;
  name: string;
  nameBn: string;
  slug: string;
  icon: string;
  description: string;
};

export type Supplier = {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  sourceUrl: string;
  status: 'active' | 'inactive';
  notes: string;
  createdAt: string;
};

/** Full product record — admin only. Sellers get `SellerProduct`. */
export type Product = {
  id: string;
  name: string;
  nameBn: string;
  slug: string;
  description: string;
  images: string[];
  categoryId: string;
  supplierId: string;
  supplierCost: number;
  platformMargin: number;
  deliveryCharge: number;
  packagingCharge: number;
  status: ProductStatus;
  availability: Availability;
  /** Suggested retail price shown to sellers as a hint. */
  suggestedPrice: number;
  createdAt: string;
};

/** What a seller may see: no supplier cost, no platform margin, no supplier. */
export type SellerProduct = Omit<Product, 'supplierCost' | 'platformMargin' | 'supplierId'> & {
  basePrice: number;
};

/** What a public visitor may see: no prices at all. */
export type PublicProduct = Pick<
  Product,
  'id' | 'name' | 'nameBn' | 'slug' | 'images' | 'categoryId' | 'availability'
>;

export type SellerStatus = 'active' | 'pending' | 'inactive' | 'suspended';

export type Seller = {
  id: string;
  name: string;
  shopName: string;
  email: string;
  phone: string;
  district: string;
  address: string;
  status: SellerStatus;
  joinedAt: string;
  avatarColor: string;
  payout: { method: PaymentMethod; account: string };
};

export type OrderStatus =
  | 'placed'
  | 'processing'
  | 'confirmed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type DeliveryArea = 'inside_dhaka' | 'sub_dhaka' | 'outside_dhaka';

export type OrderEvent = { status: OrderStatus; at: string; note?: string };

export type Order = {
  id: string;
  invoiceNo: string;
  sellerId: string;
  productId: string;
  productName: string;
  quantity: number;
  /** Snapshot of prices at order time. */
  basePrice: number;
  supplierCost: number;
  platformMargin: number;
  sellingPrice: number;
  deliveryCharge: number;
  packagingCharge: number;
  customer: {
    name: string;
    phone: string;
    altPhone?: string;
    address: string;
    district: string;
    upazila: string;
    area: DeliveryArea;
  };
  status: OrderStatus;
  history: OrderEvent[];
  trackingCode?: string;
  courier?: string;
  note?: string;
  createdAt: string;
  deliveredAt?: string;
};

export type PaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'bank';

export type TransactionType =
  | 'add_balance'
  | 'delivery_charge'
  | 'packaging_charge'
  | 'seller_earning'
  | 'withdrawal'
  | 'withdrawal_fee'
  | 'refund';

export type TransactionStatus = 'completed' | 'pending' | 'failed';

export type Transaction = {
  id: string;
  sellerId: string;
  type: TransactionType;
  /** Signed: positive credits the wallet, negative debits it. */
  amount: number;
  status: TransactionStatus;
  description: string;
  orderId?: string;
  createdAt: string;
};

export type EarningStatus = 'pending' | 'released';

export type Earning = {
  id: string;
  sellerId: string;
  orderId: string;
  amount: number;
  deliveredAt: string;
  releaseAt: string;
  status: EarningStatus;
};

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export type Withdrawal = {
  id: string;
  sellerId: string;
  amount: number;
  fee: number;
  method: PaymentMethod;
  account: string;
  status: WithdrawalStatus;
  requestedAt: string;
  processedAt?: string;
  note?: string;
};

export type DepositStatus = 'pending' | 'completed' | 'failed';

export type Deposit = {
  id: string;
  sellerId: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  status: DepositStatus;
  createdAt: string;
};

export type ExpenseCategory =
  'courier' | 'packaging' | 'marketing' | 'salary' | 'software' | 'office' | 'other';

export type Expense = {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  note?: string;
};

export type NotificationKind =
  'order' | 'status' | 'payment' | 'withdrawal' | 'earning' | 'account';

export type AppNotification = {
  id: string;
  audience: Role;
  /** Seller-scoped notifications carry the seller id. */
  sellerId?: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: string;
};

export type TicketStatus = 'open' | 'in_progress' | 'resolved';

export type SupportTicket = {
  id: string;
  sellerId: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: 'low' | 'normal' | 'high';
  createdAt: string;
};

export type WithdrawalFeeRules = {
  /** Amounts below this threshold pay `lowFee`, above it pay `highFee`. */
  threshold: number;
  lowFee: number;
  highFee: number;
  /** Fee for an amount exactly equal to the threshold (not yet decided by the business). */
  atThresholdFee: number;
};

export type PlatformSettings = {
  platformName: string;
  contactEmail: string;
  supportPhone: string;
  currency: string;
  timezone: string;
  defaultMargin: number;
  defaultPackagingCharge: number;
  deliveryCharges: Record<DeliveryArea, number>;
  minAddBalance: number;
  minWithdrawal: number;
  withdrawalFees: WithdrawalFeeRules;
  earningsReleaseHours: number;
  telegramSupport: string;
  telegramGroup: string;
};
