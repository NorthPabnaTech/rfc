import 'server-only';

import type { Supplier } from '@/database';
import type { SupplierCatalogProductDTO, SupplierCatalogVariantDTO } from '@/types';
import type { SupplierOrderStatus } from '@lib/constants';
import { AppError } from '@lib/errors';

import { assertRateLimit, sleep } from './rate-limiter';
import type {
  SupplierAdapter,
  SupplierOrderStatusResult,
  SupplierOrderSubmitPayload,
  SupplierOrderSubmitResult,
  SupplierProductsPage,
} from './types';

const DEFAULT_BASE_URL = 'https://api.businesskoro.com/api/v1/storefront';
const DEFAULT_ENV_VAR = 'BUSINESS_KORO_API_KEY';

type RawVariant = {
  id?: string;
  color?: string | null;
  size?: string | null;
  stockQuantity?: number;
  inStock?: boolean;
};

type RawProduct = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  category?: string;
  image?: string;
  images?: string[];
  suggestedPrice?: number;
  suggestedPriceMin?: number;
  suggestedPriceMax?: number;
  costPrice?: number;
  packagingCost?: number;
  minimumSellingPrice?: {
    customerPaysDelivery?: number;
    resellerPaysDeliveryInsideDhaka?: number;
    resellerPaysDeliveryOutsideDhaka?: number;
  };
  stockQuantity?: number;
  inStock?: boolean;
  variants?: RawVariant[];
};

type RawProductsResponse = {
  data?: RawProduct[];
  products?: RawProduct[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  deliveryCharges?: { insideDhaka?: number; outsideDhaka?: number };
};

function readApiKey(supplier: Pick<Supplier, 'apiKeyEnvVar'>): string {
  const envName = supplier.apiKeyEnvVar?.trim() || DEFAULT_ENV_VAR;
  const key = process.env[envName]?.trim();
  if (!key) {
    throw new AppError(
      `Supplier API key environment variable (${envName}) is not configured on the server.`,
      500,
    );
  }
  return key;
}

function buildHeaders(supplier: Supplier): Record<string, string> {
  const headers: Record<string, string> = {
    'x-api-key': readApiKey(supplier),
    'Content-Type': 'application/json',
  };
  const domain = supplier.apiDomain?.trim() || process.env.BUSINESS_KORO_DOMAIN?.trim();
  if (domain) {
    headers['x-domain'] = domain;
  }
  return headers;
}

function baseUrl(supplier: Supplier): string {
  return (supplier.apiBaseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function mapProduct(
  raw: RawProduct,
  deliveryCharges: { insideDhaka: number; outsideDhaka: number },
): SupplierCatalogProductDTO {
  const images = Array.isArray(raw.images)
    ? raw.images.filter((u): u is string => typeof u === 'string' && u.length > 0)
    : [];
  if (raw.image && !images.includes(raw.image)) images.unshift(raw.image);

  const variants: SupplierCatalogVariantDTO[] = Array.isArray(raw.variants)
    ? raw.variants
        .filter((v): v is RawVariant & { id: string } => Boolean(v?.id))
        .map((v) => ({
          id: String(v.id),
          color: v.color ?? null,
          size: v.size ?? null,
          stockQuantity: Number(v.stockQuantity ?? 0),
          inStock: Boolean(v.inStock),
        }))
    : [];

  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? 'Unnamed product'),
    slug: raw.slug,
    description: raw.description,
    category: raw.category,
    images,
    suggestedPrice: Number(raw.suggestedPrice ?? 0),
    suggestedPriceMin: raw.suggestedPriceMin != null ? Number(raw.suggestedPriceMin) : undefined,
    suggestedPriceMax: raw.suggestedPriceMax != null ? Number(raw.suggestedPriceMax) : undefined,
    costPrice: Number(raw.costPrice ?? 0),
    packagingCost: Number(raw.packagingCost ?? 0),
    minimumSellingPrice: {
      customerPaysDelivery: Number(raw.minimumSellingPrice?.customerPaysDelivery ?? 0),
      resellerPaysDeliveryInsideDhaka: Number(
        raw.minimumSellingPrice?.resellerPaysDeliveryInsideDhaka ?? 0,
      ),
      resellerPaysDeliveryOutsideDhaka: Number(
        raw.minimumSellingPrice?.resellerPaysDeliveryOutsideDhaka ?? 0,
      ),
    },
    deliveryCharges,
    stockQuantity: Number(raw.stockQuantity ?? 0),
    inStock: Boolean(raw.inStock),
    variants,
  };
}

function mapExternalOrderStatus(
  externalStatus?: string,
  paymentStatus?: string,
): SupplierOrderStatus {
  const st = (externalStatus ?? '').toUpperCase();
  const pay = (paymentStatus ?? '').toUpperCase();
  if (st === 'PENDING_PAYMENT' || pay === 'PENDING_PAYMENT') return 'pending_payment';
  if (st === 'CANCELLED' || st === 'CANCELED') return 'cancelled';
  if (st === 'DELIVERED' || st === 'COMPLETED') return 'delivered';
  if (st === 'SHIPPED' || st === 'IN_TRANSIT' || st === 'DISPATCHED') return 'shipped';
  if (st === 'PROCESSING' || st === 'CONFIRMED' || st === 'PACKED') return 'processing';
  if (st === 'FAILED' || st === 'REJECTED') return 'failed';
  return 'submitted';
}

function sanitizeResponseSummary(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  const safe: Record<string, unknown> = {};
  for (const key of [
    'id',
    'orderId',
    'orderNumber',
    'status',
    'paymentStatus',
    'duplicate',
    'message',
    'error',
    'statusCode',
    'totalAmount',
    'deliveryCharge',
    'createdAt',
    'updatedAt',
  ]) {
    if (key in obj && obj[key] !== undefined) safe[key] = obj[key];
  }
  if ('data' in obj && obj.data && typeof obj.data === 'object') {
    safe.data = sanitizeResponseSummary(obj.data);
  }
  return safe;
}

async function fetchJsonWithRetry(
  url: string,
  init: RequestInit,
  { allowRetryOn429 }: { allowRetryOn429: boolean },
): Promise<{ status: number; json: unknown; text: string }> {
  const maxAttempts = allowRetryOn429 ? 3 : 1;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, { ...init, cache: 'no-store' });
    const text = await res.text();
    let json: unknown = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { message: text };
    }

    if (res.status === 429 && allowRetryOn429 && attempt < maxAttempts) {
      const retryAfter = Number(res.headers.get('retry-after') ?? 0);
      const delayMs = retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt;
      await sleep(Math.min(delayMs, 8000));
      continue;
    }

    return { status: res.status, json, text };
  }
  throw new AppError('Supplier API rate limit exceeded.', 429);
}

function extractApiErrorMessage(json: unknown, fallback: string): string {
  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.trim()) return obj.message;
    if (Array.isArray(obj.message)) return obj.message.join(', ');
    if (typeof obj.error === 'string' && obj.error.trim()) return obj.error;
  }
  return fallback;
}

export const BusinessKoroAdapter: SupplierAdapter = {
  provider: 'business_koro',

  isConfigured(supplier) {
    const envName = supplier.apiKeyEnvVar?.trim() || DEFAULT_ENV_VAR;
    return Boolean(process.env[envName]?.trim());
  },

  async fetchProducts(supplier, opts = {}): Promise<SupplierProductsPage> {
    assertRateLimit(String(supplier._id), ['products_min']);
    const params = new URLSearchParams();
    if (opts.page) params.set('page', String(opts.page));
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.search?.trim()) params.set('search', opts.search.trim());

    const qs = params.toString();
    const url = `${baseUrl(supplier)}/products${qs ? `?${qs}` : ''}`;
    const { status, json } = await fetchJsonWithRetry(
      url,
      { method: 'GET', headers: buildHeaders(supplier) },
      { allowRetryOn429: true },
    );

    if (status < 200 || status >= 300) {
      throw new AppError(
        extractApiErrorMessage(json, `Business Koro returned HTTP ${status}`),
        status >= 400 && status < 500 ? status : 502,
      );
    }

    const body = json as RawProductsResponse;
    const deliveryCharges = {
      insideDhaka: Number(body.deliveryCharges?.insideDhaka ?? 70),
      outsideDhaka: Number(body.deliveryCharges?.outsideDhaka ?? 130),
    };
    const rawList = Array.isArray(body.data)
      ? body.data
      : Array.isArray(body.products)
        ? body.products
        : [];

    return {
      products: rawList.map((p) => mapProduct(p, deliveryCharges)),
      total: Number(body.total ?? rawList.length),
      page: Number(body.page ?? opts.page ?? 1),
      totalPages: Math.max(1, Number(body.totalPages ?? 1)),
      deliveryCharges,
    };
  },

  async fetchAllProducts(supplier) {
    const all: SupplierCatalogProductDTO[] = [];
    let page = 1;
    let totalPages = 1;
    let deliveryCharges: { insideDhaka: number; outsideDhaka: number } | undefined;

    do {
      const res = await this.fetchProducts(supplier, { page, limit: 50 });
      all.push(...res.products);
      totalPages = res.totalPages;
      if (res.deliveryCharges) deliveryCharges = res.deliveryCharges;
      page++;
    } while (page <= totalPages && page <= 20);

    return { products: all, deliveryCharges };
  },

  async submitOrder(supplier, payload: SupplierOrderSubmitPayload): Promise<SupplierOrderSubmitResult> {
    assertRateLimit(String(supplier._id), ['orders_min', 'orders_hour']);
    const url = `${baseUrl(supplier)}/orders`;

    const body: Record<string, unknown> = {
      productId: payload.productId,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerAddress: payload.customerAddress,
      customerDivision: payload.customerDivision,
      customerDistrict: payload.customerDistrict,
      customerArea: payload.customerArea,
      sellingPrice: payload.sellingPrice,
      deliveryChargePaidByCustomer: payload.deliveryChargePaidByCustomer,
    };

    if (payload.variantId) body.variantId = payload.variantId;
    if (payload.quantity > 1) body.quantity = payload.quantity;
    if (payload.customerNote?.trim()) body.customerNote = payload.customerNote.trim();
    if (payload.deliveryChargePaidByCustomer && payload.deliveryChargePaidUpfront) {
      body.deliveryChargeCollectionMode = 'CUSTOMER_PAID_RESELLER_UPFRONT';
    }
    if (payload.allowDuplicate) {
      body.allowDuplicate = true;
    }

    // Never blind-retry POST requests to prevent duplicate supplier orders.
    const { status, json } = await fetchJsonWithRetry(
      url,
      { method: 'POST', headers: buildHeaders(supplier), body: JSON.stringify(body) },
      { allowRetryOn429: false },
    );

    const safe = sanitizeResponseSummary(json);
    const dataObj =
      json && typeof json === 'object' && 'data' in json && (json as Record<string, unknown>).data
        ? ((json as Record<string, unknown>).data as Record<string, unknown>)
        : ((json as Record<string, unknown>) ?? {});

    if (status < 200 || status >= 300) {
      throw new AppError(
        extractApiErrorMessage(json, `Business Koro order submission failed (HTTP ${status})`),
        status >= 400 && status < 500 ? status : 502,
      );
    }

    const externalOrderId = String(
      dataObj.id ?? dataObj.orderId ?? dataObj.orderNumber ?? safe.id ?? safe.orderId ?? '',
    );
    const externalStatus = typeof dataObj.status === 'string' ? dataObj.status : undefined;
    const paymentStatus =
      typeof dataObj.paymentStatus === 'string' ? dataObj.paymentStatus : undefined;
    const isDuplicate = Boolean(
      (json as Record<string, unknown>)?.duplicate ?? dataObj.duplicate ?? false,
    );

    return {
      externalOrderId: externalOrderId || undefined,
      status: mapExternalOrderStatus(externalStatus, paymentStatus),
      externalStatus,
      paymentStatus,
      isDuplicate,
      message:
        typeof (json as Record<string, unknown>)?.message === 'string'
          ? String((json as Record<string, unknown>).message)
          : undefined,
      rawSummary: safe,
    };
  },

  async getOrderStatus(supplier, externalOrderId): Promise<SupplierOrderStatusResult> {
    assertRateLimit(String(supplier._id), ['products_min']);
    const url = `${baseUrl(supplier)}/orders/${encodeURIComponent(externalOrderId)}`;
    const { status, json } = await fetchJsonWithRetry(
      url,
      { method: 'GET', headers: buildHeaders(supplier) },
      { allowRetryOn429: true },
    );

    if (status < 200 || status >= 300) {
      throw new AppError(
        extractApiErrorMessage(json, `Failed to retrieve supplier order (HTTP ${status})`),
        status >= 400 && status < 500 ? status : 502,
      );
    }

    const safe = sanitizeResponseSummary(json);
    const dataObj =
      json && typeof json === 'object' && 'data' in json && (json as Record<string, unknown>).data
        ? ((json as Record<string, unknown>).data as Record<string, unknown>)
        : ((json as Record<string, unknown>) ?? {});

    const externalStatus = typeof dataObj.status === 'string' ? dataObj.status : undefined;
    const paymentStatus =
      typeof dataObj.paymentStatus === 'string' ? dataObj.paymentStatus : undefined;

    return {
      externalOrderId,
      status: mapExternalOrderStatus(externalStatus, paymentStatus),
      externalStatus,
      paymentStatus,
      rawSummary: safe,
    };
  },
};
