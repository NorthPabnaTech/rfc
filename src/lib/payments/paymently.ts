import 'server-only';

import crypto from 'node:crypto';

import { AppError } from '@lib/errors';

const GATEWAY_TIMEOUT_MS = 15_000;

function getPaymentlyConfig(): { baseUrl: string; apiKey: string } {
  const rawBase = process.env.UDDOKTA_PAY_BASE_URL?.trim();
  const apiKey = process.env.UDDOKTA_PAY_API_KEY?.trim();

  if (!rawBase || !apiKey) {
    throw new AppError('Online payment gateway is not configured.', 503);
  }

  // Normalize base URL so both `.../api` and `...` resolve to `.../api`.
  const stripped = rawBase.replace(/\/+$/, '');
  const baseUrl = stripped.endsWith('/api') ? stripped : `${stripped}/api`;
  return { baseUrl, apiKey };
}

export function isPaymentlyConfigured(): boolean {
  return Boolean(
    process.env.UDDOKTA_PAY_BASE_URL?.trim() && process.env.UDDOKTA_PAY_API_KEY?.trim(),
  );
}

export type CreateChargeParams = {
  fullName: string;
  email: string;
  amount: number;
  metadata: Record<string, string>;
  redirectUrl: string;
  cancelUrl: string;
  webhookUrl: string;
};

export async function createPaymentlyCharge(
  params: CreateChargeParams,
): Promise<{ paymentUrl: string }> {
  const { baseUrl, apiKey } = getPaymentlyConfig();

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/checkout-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'RT-UDDOKTAPAY-API-KEY': apiKey,
      },
      body: JSON.stringify({
        full_name: params.fullName,
        email: params.email,
        amount: String(params.amount),
        metadata: params.metadata,
        redirect_url: params.redirectUrl,
        return_type: 'GET',
        cancel_url: params.cancelUrl,
        webhook_url: params.webhookUrl,
      }),
      signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new AppError('Payment gateway timed out. Please try again.', 504);
    }
    throw new AppError('Unable to reach payment gateway. Please try again.', 502);
  }

  let data: { status?: boolean; message?: string; payment_url?: string } | null = null;
  try {
    data = (await response.json()) as { status?: boolean; message?: string; payment_url?: string };
  } catch {
    throw new AppError('Invalid response from payment gateway.', 502);
  }

  if (!response.ok || !data?.status || !data.payment_url) {
    throw new AppError(data?.message || 'Could not start online payment session.', 502);
  }

  return { paymentUrl: data.payment_url };
}

export type PaymentlyVerifyResult = {
  status: 'COMPLETED' | 'PENDING' | 'ERROR';
  amount: number;
  fee: number;
  chargedAmount: number;
  invoiceId: string;
  transactionId?: string;
  paymentMethod?: string;
  senderNumber?: string;
  metadata: Record<string, unknown>;
  message?: string;
};

export async function verifyPaymentlyInvoice(invoiceId: string): Promise<PaymentlyVerifyResult> {
  const { baseUrl, apiKey } = getPaymentlyConfig();

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'RT-UDDOKTAPAY-API-KEY': apiKey,
      },
      body: JSON.stringify({ invoice_id: invoiceId }),
      signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new AppError('Payment verification timed out. Please refresh to check status.', 504);
    }
    throw new AppError('Unable to verify payment right now.', 502);
  }

  let raw: Record<string, unknown> | null = null;
  try {
    raw = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new AppError('Invalid verification response from payment gateway.', 502);
  }

  if (!response.ok || !raw) {
    throw new AppError('Payment verification failed.', 502);
  }

  // Handle both top-level fields and nested `data` object across UddoktaPay/Paymently versions.
  const payload =
    raw.data && typeof raw.data === 'object' ? (raw.data as Record<string, unknown>) : raw;

  const statusVal =
    typeof payload.status === 'string'
      ? payload.status
      : typeof raw.status === 'string'
        ? raw.status
        : 'ERROR';
  const statusRaw = statusVal.toUpperCase();
  const status: PaymentlyVerifyResult['status'] =
    statusRaw === 'COMPLETED' ? 'COMPLETED' : statusRaw === 'PENDING' ? 'PENDING' : 'ERROR';

  return {
    status,
    amount: Number(payload.amount ?? 0),
    fee: Number(payload.fee ?? 0),
    chargedAmount: Number(payload.charged_amount ?? payload.amount ?? 0),
    invoiceId: String(payload.invoice_id ?? invoiceId),
    transactionId: payload.transaction_id ? String(payload.transaction_id) : undefined,
    paymentMethod: payload.payment_method ? String(payload.payment_method) : undefined,
    senderNumber: payload.sender_number ? String(payload.sender_number) : undefined,
    metadata:
      payload.metadata && typeof payload.metadata === 'object'
        ? (payload.metadata as Record<string, unknown>)
        : {},
    message: raw.message ? String(raw.message) : undefined,
  };
}

export function verifyWebhookSignature(headerApiKey: string | null): boolean {
  const configured = process.env.UDDOKTA_PAY_API_KEY?.trim();
  if (!configured || !headerApiKey) return false;
  const a = Buffer.from(configured, 'utf8');
  const b = Buffer.from(headerApiKey.trim(), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function getTokenSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) throw new Error('AUTH_SECRET is required to sign payment tokens.');
  return secret;
}

export function signOrderPaymentToken(orderId: string, orderNumber: string): string {
  return crypto
    .createHmac('sha256', getTokenSecret())
    .update(`paymently:${orderId}:${orderNumber}`)
    .digest('hex');
}

export function verifyOrderPaymentToken(
  orderId: string,
  orderNumber: string,
  token?: string | null,
): boolean {
  if (!token) return false;
  const expected = signOrderPaymentToken(orderId, orderNumber);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(token, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
