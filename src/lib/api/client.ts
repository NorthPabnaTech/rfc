import { PLATFORM } from '@config/platform';

const TOKEN_KEY = 'rfc_reseller_token';

export function getResellerToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setResellerToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearResellerToken(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** `Authorization` header for this app's own seller Route Handlers (`/api/seller/*`, `/api/payments/*`). */
export function authHeaders(): Record<string, string> {
  const token = getResellerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  authenticated?: boolean;
};

export function getApiBaseUrl(): string {
  return (PLATFORM.apiUrl || 'http://localhost:3000/api/reseller').replace(/\/+$/, '');
}

export async function apiRaw<T>(
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {},
): Promise<ApiEnvelope<T>> {
  const { skipAuth, headers, ...rest } = init;
  const token = skipAuth ? null : getResellerToken();

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    /* non-JSON response */
  }

  if (!res.ok || !json?.ok) {
    const msg = json?.error || res.statusText || 'Request failed';
    throw new ApiError(msg, res.status);
  }

  return json;
}

export async function api<T>(
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const envelope = await apiRaw<T>(path, init);
  return envelope.data as T;
}
