import { HAS_API, PLATFORM } from '@config/platform';

/*
 * Phase 2 API client — NOT used in Phase 1.
 *
 * Phase 1 pages read and mutate the demo store (`src/stores/platform-store.ts`).
 * When the backend exists, set NEXT_PUBLIC_API_URL and move each store action
 * onto these endpoints (the store's action names map 1:1 to the routes below),
 * keeping the UI unchanged. Nothing here makes a request until then.
 */

export const ENDPOINTS = {
  login: '/auth/login',
  register: '/auth/register',
  products: '/products',
  product: (id: string) => `/products/${id}`,
  categories: '/categories',
  suppliers: '/suppliers',
  sellers: '/sellers',
  seller: (id: string) => `/sellers/${id}`,
  orders: '/orders',
  order: (id: string) => `/orders/${id}`,
  orderStatus: (id: string) => `/orders/${id}/status`,
  wallet: '/wallet',
  deposits: '/wallet/deposits',
  withdrawals: '/wallet/withdrawals',
  withdrawal: (id: string) => `/wallet/withdrawals/${id}`,
  transactions: '/wallet/transactions',
  earnings: '/wallet/earnings',
  analytics: '/analytics',
  expenses: '/expenses',
  notifications: '/notifications',
  tickets: '/support/tickets',
  settings: '/settings',
} as const;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!HAS_API) throw new ApiError('API is not configured (Phase 1 uses mock data).', 0);
  const res = await fetch(`${PLATFORM.apiUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  if (!res.ok) throw new ApiError(await res.text().catch(() => res.statusText), res.status);
  return (await res.json()) as T;
}
