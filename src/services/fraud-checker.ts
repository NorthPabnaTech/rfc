import 'server-only';

import { AppError } from '@lib/errors';
import { bdPhone } from '@lib/validators/common';

const FRAUD_CHECKER_BASE_URL = 'https://fraudchecker.smartposbd.com/api/v1';
const REQUEST_TIMEOUT_MS = 12_000;
const RATE_LIMIT_MAX = 58; // API allows 60 req/min; keep a small safety margin
const RATE_LIMIT_WINDOW_MS = 60_000;
const CACHE_TTL_MS = 5 * 60 * 1000;

export type FraudCourierMetric = {
  key: string;
  label: string;
  available: boolean;
  message?: string;
  total: number | null;
  success: number | null;
  cancel: number | null;
  deliveredPercentage: number | null;
  returnPercentage: number | null;
  rating?: string;
  responseTime?: number;
};

export type FraudCommunityReport = {
  reportCode?: string;
  reportUrl?: string;
  title?: string;
  incidentType?: string;
  status?: string;
  orderAmount?: number;
  courierName?: string;
  createdAt?: string;
  evidencesCount?: number;
};

export type FraudCheckReport = {
  phone: string;
  score: number | null;
  source?: string;
  status?: string;
  totalParcel: number | null;
  successParcel: number | null;
  cancelParcel: number | null;
  unresolvedReports: number | null;
  couriers: FraudCourierMetric[];
  communityReports: FraudCommunityReport[];
  checkedAt: string;
};

const COURIER_LABELS: Record<string, string> = {
  steadfast: 'Steadfast',
  pathao: 'Pathao',
  redx: 'RedX',
  carrybee: 'CarryBee',
  paperfly: 'Paperfly',
};

const KNOWN_COURIER_ORDER = ['steadfast', 'pathao', 'redx', 'carrybee', 'paperfly'];

const rateTimestamps: number[] = [];
const reportCache = new Map<string, { report: FraudCheckReport; expiresAt: number }>();
const inFlightRequests = new Map<string, Promise<FraudCheckReport>>();

function assertFraudCheckerRateLimit(): void {
  const now = Date.now();
  while (rateTimestamps.length > 0 && now - (rateTimestamps[0] ?? 0) >= RATE_LIMIT_WINDOW_MS) {
    rateTimestamps.shift();
  }
  if (rateTimestamps.length >= RATE_LIMIT_MAX) {
    throw new AppError(
      'Fraud checker rate limit reached (60 requests/min). Please wait a moment and try again.',
      429,
    );
  }
  rateTimestamps.push(now);
}

function toFiniteNumber(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toOptionalString(val: unknown): string | undefined {
  return typeof val === 'string' && val.trim() !== '' ? val.trim() : undefined;
}

function formatCourierLabel(key: string): string {
  const lower = key.toLowerCase();
  if (COURIER_LABELS[lower]) return COURIER_LABELS[lower];
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function mapCourierEntry(key: string, rawEntry: unknown): FraudCourierMetric {
  const label = formatCourierLabel(key);
  if (!rawEntry || typeof rawEntry !== 'object') {
    return {
      key,
      label,
      available: false,
      total: null,
      success: null,
      cancel: null,
      deliveredPercentage: null,
      returnPercentage: null,
    };
  }

  const entry = rawEntry as Record<string, unknown>;
  const data =
    entry.data && typeof entry.data === 'object' && !Array.isArray(entry.data)
      ? (entry.data as Record<string, unknown>)
      : null;

  const entryStatus = entry.status;
  const available = entryStatus !== false && data !== null;
  const rating = toOptionalString(data?.rating);

  return {
    key,
    label,
    available,
    message: toOptionalString(entry.message),
    total: data ? toFiniteNumber(data.total) : null,
    success: data ? toFiniteNumber(data.success) : null,
    cancel: data ? toFiniteNumber(data.cancel) : null,
    deliveredPercentage: data ? toFiniteNumber(data.deliveredPercentage) : null,
    returnPercentage: data ? toFiniteNumber(data.returnPercentage) : null,
    rating,
    responseTime: data ? (toFiniteNumber(data.response_time) ?? undefined) : undefined,
  };
}

function mapCommunityReport(raw: unknown): FraudCommunityReport | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const reportUrl = toOptionalString(r.report_url);
  const safeUrl = reportUrl && /^https?:\/\//i.test(reportUrl) ? reportUrl : undefined;

  return {
    reportCode: toOptionalString(r.report_code),
    reportUrl: safeUrl,
    title: toOptionalString(r.title),
    incidentType: toOptionalString(r.incident_type),
    status: toOptionalString(r.status),
    orderAmount: toFiniteNumber(r.order_amount) ?? undefined,
    courierName: toOptionalString(r.courier_name),
    createdAt: toOptionalString(r.created_at),
    evidencesCount: toFiniteNumber(r.evidences_count) ?? undefined,
  };
}

export function mapFraudCheckResponse(raw: unknown, normalizedPhone: string): FraudCheckReport {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new AppError('Received an invalid response from the fraud checker service.', 502);
  }

  const obj = raw as Record<string, unknown>;
  const rawResponse =
    obj.response && typeof obj.response === 'object' && !Array.isArray(obj.response)
      ? (obj.response as Record<string, unknown>)
      : {};

  const orderedKeys = [
    ...KNOWN_COURIER_ORDER.filter((k) => k in rawResponse),
    ...Object.keys(rawResponse).filter((k) => !KNOWN_COURIER_ORDER.includes(k)),
  ];

  const couriers = orderedKeys.map((k) => mapCourierEntry(k, rawResponse[k]));

  const rawReports = Array.isArray(obj.community_reports) ? obj.community_reports : [];
  const communityReports = rawReports
    .map(mapCommunityReport)
    .filter((r): r is FraudCommunityReport => r !== null);

  return {
    phone: toOptionalString(obj.phone) ?? normalizedPhone,
    score: toFiniteNumber(obj.score),
    source: toOptionalString(obj.source),
    status: toOptionalString(obj.status),
    totalParcel: toFiniteNumber(obj.total_parcel),
    successParcel: toFiniteNumber(obj.success_parcel),
    cancelParcel: toFiniteNumber(obj.cancel_parcel),
    unresolvedReports: toFiniteNumber(obj.unresolved_reports),
    couriers,
    communityReports,
    checkedAt: new Date().toISOString(),
  };
}

export function normalizeBdPhone(rawPhone: string): string {
  const parsed = bdPhone.safeParse(rawPhone);
  if (!parsed.success) {
    throw new AppError(
      parsed.error.issues[0]?.message ?? 'Enter a valid 11-digit Bangladeshi mobile number.',
      400,
    );
  }
  return parsed.data;
}

function mapHttpError(status: number, json: unknown): AppError {
  const apiMessage =
    json && typeof json === 'object' && 'message' in json && typeof json.message === 'string'
      ? json.message.trim()
      : '';

  switch (status) {
    case 400:
      return new AppError(
        apiMessage || 'Invalid Bangladeshi mobile number (must be 11 digits, e.g. 01XXXXXXXXX).',
        400,
      );
    case 401:
      return new AppError(
        'Fraud checker API authentication failed. Please check FREE_FRAUD_CHECKER_API_KEY.',
        401,
      );
    case 403:
      return new AppError(
        'Fraud checker API access forbidden. The API key may be deactivated or domain-restricted.',
        403,
      );
    case 422:
      return new AppError(
        apiMessage || 'Fraud checker request validation failed.',
        422,
      );
    case 429:
      return new AppError(
        'Fraud checker API rate limit exceeded (60 requests/min). Please wait and try again.',
        429,
      );
    default:
      if (status >= 500) {
        return new AppError(
          'Fraud checker service is temporarily unavailable. Please try again shortly.',
          502,
        );
      }
      return new AppError(
        apiMessage || `Fraud checker request failed (HTTP ${status}).`,
        502,
      );
  }
}

export async function checkCourierFraud(rawPhone: string): Promise<FraudCheckReport> {
  const phone = normalizeBdPhone(rawPhone);

  const apiKey = process.env.FREE_FRAUD_CHECKER_API_KEY?.trim();
  if (!apiKey) {
    throw new AppError(
      'Free Fraud Checker API key (FREE_FRAUD_CHECKER_API_KEY) is not configured on the server.',
      503,
    );
  }

  const cached = reportCache.get(phone);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.report;
  }

  const existingFlight = inFlightRequests.get(phone);
  if (existingFlight) {
    return existingFlight;
  }

  const task = (async (): Promise<FraudCheckReport> => {
    assertFraudCheckerRateLimit();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${FRAUD_CHECKER_BASE_URL}/fraud-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-API-KEY': apiKey,
        },
        body: JSON.stringify({ phone }),
        cache: 'no-store',
        signal: controller.signal,
      });

      const text = await res.text();
      let json: unknown = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = {};
      }

      if (!res.ok) {
        throw mapHttpError(res.status, json);
      }

      const report = mapFraudCheckResponse(json, phone);
      reportCache.set(phone, { report, expiresAt: Date.now() + CACHE_TTL_MS });
      return report;
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new AppError(
          'Fraud checker API request timed out. Please try again.',
          504,
        );
      }
      throw new AppError(
        'Could not reach the fraud checker service. Please try again.',
        502,
      );
    } finally {
      clearTimeout(timer);
      inFlightRequests.delete(phone);
    }
  })();

  inFlightRequests.set(phone, task);
  return task;
}

/** Exposed only for testing cache isolation. */
export function clearFraudCheckerCache(): void {
  reportCache.clear();
  rateTimestamps.length = 0;
}
