import { api, apiRaw, getApiBaseUrl } from './client';

export type PayoutDetails = {
  bkash?: string;
  nagad?: string;
  bankInfo?: string;
};

export type ResellerProfile = {
  id: string;
  name: string;
  shopName: string;
  email: string;
  phone?: string | null;
  googleId?: string;
  avatarUrl?: string | null;
  address?: string | null;
  isActive: boolean;
  walletBalance: number;
  totalDeposited?: number;
  totalWithdrawn?: number;
  totalProfitEarned?: number;
  totalSales?: number;
  totalOrders?: number;
  payoutDetails?: PayoutDetails;
  createdAt?: string;
};

export type AuthResponse = {
  token: string;
  reseller: ResellerProfile;
};

export type ResellerProductCategory = {
  id: string;
  name: string;
  slug: string;
};

export type ResellerProductImage = {
  url: string;
  alt?: string;
};

export type ResellerProduct = {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  shortDescription?: string;
  description?: string;
  category?: ResellerProductCategory | null;
  images: ResellerProductImage[];
  variations?: { name: string; values: string[]; disabledValues?: string[] }[];
  specifications?: { label: string; value: string }[];
  stockStatus: 'in_stock' | 'limited' | 'out_of_stock' | string;
  stockQuantity?: number;
  // Price-gated fields (only present when authenticated)
  resellerPrice?: number;
  suggestedRetailPrice?: number;
  packagingCost?: number;
  deliveryCharges?: {
    insideDhaka: number;
    outsideDhaka: number;
  };
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
};

export type WalletSummaryData = {
  walletBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalProfitEarned: number;
  minDeposit: number;
  minWithdrawal: number;
};

export type WalletTxType =
  | 'deposit'
  | 'withdrawal'
  | 'order_deduction'
  | 'order_profit'
  | 'order_refund'
  | 'admin_adjustment';

export type WalletTxStatus = 'pending' | 'completed' | 'rejected' | 'failed';

export type WalletTransaction = {
  id: string;
  txNumber: string;
  type: WalletTxType;
  direction: 'credit' | 'debit';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: WalletTxStatus;
  orderNumber?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  payoutMethod?: string | null;
  payoutAccount?: string | null;
  note?: string | null;
  createdAt: string;
};

export type DepositResponse = {
  id: string;
  txNumber: string;
  amount: number;
  status: string;
  paymentMethod: string;
  paymentReference: string;
  createdAt: string;
};

export type WithdrawResponse = {
  id: string;
  txNumber: string;
  amount: number;
  status: string;
  payoutMethod: string;
  payoutAccount: string;
  walletBalance: number;
  createdAt: string;
};

export type ResellerOrderSummary = {
  resellerPriceTotal: number;
  resellerSellingTotal: number;
  deliveryCharge: number;
  packagingCost: number;
  upfrontDeducted: number;
  expectedResellerProfit: number;
  profitCredited: boolean;
  upfrontRefunded: boolean;
};

export type ResellerOrderItem = {
  productId: string;
  productName?: string;
  name?: string;
  slug?: string;
  quantity: number;
  sellingPrice?: number;
  unitPrice?: number;
  lineTotal?: number;
  resellerPrice?: number;
  variant?: Record<string, string>;
};

export type ResellerOrder = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal?: number;
  shippingFee?: number;
  total: number;
  customer?: {
    name: string;
    phone: string;
    email?: string;
  };
  shippingAddress?: {
    division?: string;
    district?: string;
    area?: string;
    street?: string;
  };
  items?: ResellerOrderItem[];
  resellerSummary?: ResellerOrderSummary;
  statusHistory?: { status: string; note?: string; at?: string; createdAt?: string }[];
  supplierTracking?: {
    status?: string;
    trackingCode?: string;
    courier?: string;
    updatedAt?: string;
    [key: string]: unknown;
  } | null;
  customerNote?: string;
  createdAt: string;
  updatedAt?: string;
};

export type DashboardData = {
  walletBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalProfitEarned: number;
  totalSales: number;
  totalOrders: number;
  statusCounts: {
    pending: number;
    confirmed: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    returned: number;
  };
  chart: {
    date: string;
    orders: number;
    revenue: number;
    profit: number;
  }[];
};

export type TicketMessage = {
  id?: string;
  sender?: string;
  senderRole?: 'reseller' | 'admin' | string;
  senderName?: string;
  message: string;
  createdAt: string;
};

export type SupportTicket = {
  id: string;
  ticketNumber?: string;
  subject: string;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  status: string;
  orderNumber?: string | null;
  message?: string;
  messages?: TicketMessage[];
  replies?: TicketMessage[];
  createdAt: string;
  updatedAt?: string;
};

export const resellerApi = {
  // 2. Auth & Profile (Google-Only)
  getGoogleAuthUrl(redirectUri: string) {
    return `${getApiBaseUrl()}/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`;
  },

  googleIdTokenLogin(idToken: string) {
    return api<AuthResponse>('/auth/google', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ idToken }),
    });
  },

  me() {
    return api<ResellerProfile>('/auth/me');
  },

  updateMe(body: {
    name?: string;
    shopName?: string;
    phone?: string;
    address?: string;
    avatarUrl?: string | null;
    payoutDetails?: PayoutDetails;
  }) {
    return api<ResellerProfile>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  // 3. Price-Gated Catalog
  async listProducts(
    params: { q?: string; category?: string; page?: number; limit?: number } = {},
    options: { skipAuth?: boolean } = {},
  ): Promise<{ authenticated: boolean; data: Paginated<ResellerProduct> }> {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.category && params.category !== 'all') sp.set('category', params.category);
    if (params.page) sp.set('page', String(params.page));
    if (params.limit) sp.set('limit', String(params.limit));
    const qs = sp.toString();
    const res = await apiRaw<Paginated<ResellerProduct>>(
      `/products${qs ? `?${qs}` : ''}`,
      options,
    );
    return {
      authenticated: Boolean(res.authenticated),
      data: res.data ?? { items: [], total: 0, page: 1, totalPages: 1 },
    };
  },

  async getProduct(
    slug: string,
    options: { skipAuth?: boolean } = {},
  ): Promise<{ authenticated: boolean; data: ResellerProduct }> {
    const res = await apiRaw<ResellerProduct>(
      `/products/${encodeURIComponent(slug)}`,
      options,
    );
    return {
      authenticated: Boolean(res.authenticated),
      data: res.data!,
    };
  },

  // 4. Wallet & Transactions
  getWallet() {
    return api<WalletSummaryData>('/wallet');
  },

  listTransactions(params: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  } = {}) {
    const sp = new URLSearchParams();
    if (params.page) sp.set('page', String(params.page));
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.type && params.type !== 'all') sp.set('type', params.type);
    if (params.status && params.status !== 'all') sp.set('status', params.status);
    const qs = sp.toString();
    return api<Paginated<WalletTransaction>>(`/wallet/transactions${qs ? `?${qs}` : ''}`);
  },

  deposit(body: {
    amount: number;
    paymentMethod: string;
    paymentReference: string;
    note?: string;
  }) {
    return api<DepositResponse>('/wallet/deposit', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  withdraw(body: {
    amount: number;
    payoutMethod: string;
    payoutAccount: string;
    note?: string;
  }) {
    return api<WithdrawResponse>('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // 5. Orders
  placeOrder(body: {
    customer: { name: string; phone: string; email?: string };
    shippingAddress: { division: string; district: string; area: string; street: string };
    items: {
      productId: string;
      quantity: number;
      sellingPrice: number;
      variant?: Record<string, string>;
    }[];
    customerNote?: string;
  }) {
    return api<ResellerOrder>('/orders', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  listOrders(params: { page?: number; limit?: number; status?: string } = {}) {
    const sp = new URLSearchParams();
    if (params.page) sp.set('page', String(params.page));
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.status && params.status !== 'all') sp.set('status', params.status);
    const qs = sp.toString();
    return api<Paginated<ResellerOrder> | ResellerOrder[]>(`/orders${qs ? `?${qs}` : ''}`);
  },

  getOrder(id: string) {
    return api<ResellerOrder>(`/orders/${encodeURIComponent(id)}`);
  },

  cancelOrder(id: string, reason?: string) {
    return api<ResellerOrder>(`/orders/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      body: JSON.stringify(reason ? { reason } : {}),
    });
  },

  // 6. Dashboard
  getDashboard(days = 30) {
    return api<DashboardData>(`/dashboard?days=${days}`);
  },

  // 7. Support Tickets
  listTickets(status?: string) {
    const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    return api<SupportTicket[] | Paginated<SupportTicket>>(`/tickets${qs}`);
  },

  createTicket(body: {
    subject: string;
    category?: string;
    priority?: 'low' | 'medium' | 'high';
    orderNumber?: string;
    message: string;
  }) {
    return api<SupportTicket>('/tickets', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  getTicket(id: string) {
    return api<SupportTicket>(`/tickets/${encodeURIComponent(id)}`);
  },

  replyTicket(id: string, message: string) {
    return api<SupportTicket>(`/tickets/${encodeURIComponent(id)}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },
};
