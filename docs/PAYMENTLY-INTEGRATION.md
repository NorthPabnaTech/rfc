# Paymently Payment Gateway Integration

This document describes the Paymently (UddoktaPay v2 API) online payment integration in **RFC Gadget**.

---

## 1. Integration Architecture

- **Gateway Client** (`src/lib/payments/paymently.ts`, server-only):
  - Communicates with `UDDOKTA_PAY_BASE_URL` (`/checkout-v2` and `/verify-payment`) using `RT-UDDOKTAPAY-API-KEY` from `UDDOKTA_PAY_API_KEY`.
  - Enforces a 15-second `AbortSignal.timeout(15_000)` on all gateway requests.
  - Provides constant-time webhook header verification (`verifyWebhookSignature`) and HMAC-SHA256 order payment tokens (`signOrderPaymentToken` / `verifyOrderPaymentToken`) for guest + authenticated checkouts.
- **Payment Service** (`src/services/payments.ts`, server-only):
  - `createPaymentlySessionForOrder`: Validates order ownership (user ID or signed `paymentToken`), checks eligibility (`unpaid`, not `cancelled`/`returned`, `total > 0`), reads the authoritative order total from MongoDB, and creates a Paymently checkout session.
  - `verifyAndCompletePaymentlyOrder`: Verifies the transaction directly via Paymently's `POST /verify-payment` API, validates `status === 'COMPLETED'`, order match, amount match, and duplicate/replay protection, then atomically marks the order `paid` in MongoDB (`{ _id, paymentStatus: { $ne: 'paid' } }`).
- **API Route Handlers** (Vercel serverless compatible):
  - `POST /api/payments/paymently/create`
  - `POST /api/payments/paymently/verify`
  - `POST /api/payments/paymently/webhook`
- **Frontend**:
  - Checkout (`src/app/(public)/checkout/components/checkout-form.tsx`): Allows selecting **Cash on Delivery** or **Pay Online (Paymently)** (`Pay Now`).
  - Order Confirmation (`src/app/(public)/order-success/[orderNumber]/page.tsx` + `paymently-verifier.tsx`): Automatically verifies `invoice_id` via `/api/payments/paymently/verify` on return and provides a **Pay Now with Paymently** retry button if unpaid/cancelled.

---

## 2. Payment Flow

1. Customer selects **Pay Online (Paymently)** at `/checkout` and clicks **Pay Now**.
2. `placeOrderAction` creates the order in MongoDB (`paymentMethod: 'paymently'`, `paymentStatus: 'unpaid'`) and returns `{ orderNumber, orderId, paymentToken }`.
3. Frontend calls `POST /api/payments/paymently/create` with `{ orderId, paymentToken }`.
4. Backend fetches `order.total` from MongoDB, calls Paymently `POST /checkout-v2`, and returns `{ paymentUrl }`.
5. Customer is redirected to Paymently's hosted checkout page.
6. Upon completion/cancellation:
   - **Redirect return**: Customer returns to `/order-success/[orderNumber]?gateway=paymently&invoice_id=...` (or `&cancelled=1`). `PaymentlyVerifier` calls `POST /api/payments/paymently/verify`, which verifies via Paymently's `/verify-payment` API before updating MongoDB to `paid`.
   - **Webhook**: Paymently sends `POST /api/payments/paymently/webhook` with `RT-UDDOKTAPAY-API-KEY` header. The endpoint validates the header, then independently verifies via `/verify-payment` and atomically updates the order (`idempotent` across concurrent calls).

---

## 3. API Endpoints Created

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `POST` | `/api/payments/paymently/create` | Creates a Paymently `/checkout-v2` session for an existing eligible order and returns `{ paymentUrl }`. |
| `POST` | `/api/payments/paymently/verify` | Verifies an `invoiceId` server-side via Paymently `/verify-payment` and updates order `paymentStatus` to `paid`. |
| `POST` | `/api/payments/paymently/webhook` | Public IPN webhook; validates `RT-UDDOKTAPAY-API-KEY`, verifies via `/verify-payment`, and updates order idempotently. |

---

## 4. MongoDB Schema Changes

Modified `src/database/models/order.ts`:

- `PAYMENT_METHODS` (`src/lib/constants.ts`) extended from `['cod']` to `['cod', 'paymently']`.
- Added fields on `Order`:
  - `paymentGateway`: `string | null` (e.g. `'paymently'`)
  - `paymentReference`: `string | null` (Paymently `invoice_id`, sparse index)
  - `gatewayTransactionId`: `string | null` (Gateway `transaction_id`, sparse index)
  - `gatewayPaymentMethod`: `string | null` (e.g. `'bKash'`, `'Nagad'`)
  - `paidAt`: `Date | null`

---

## 5. Required Environment Variables

Add to `.env.local` (local) and **Vercel Project Settings → Environment Variables** (Production & Preview):

```env
UDDOKTA_PAY_BASE_URL=https://rfcgadget.paymently.io/api
UDDOKTA_PAY_API_KEY=your_actual_secret_api_key
```

> **Security:** Never prefix `UDDOKTA_PAY_API_KEY` with `NEXT_PUBLIC_`. It must remain server-only.

---

## 6. Manual Configuration in Paymently Dashboard

Complete these steps in your Paymently merchant dashboard (`rfcgadget.paymently.io`):

1. **API Key & Permissions** (`Brand Settings → API Settings`):
   - Confirm your API key has `payment:checkout` and `payment:verify` permissions enabled.
   - Copy the secret key into `UDDOKTA_PAY_API_KEY` in `.env.local` and Vercel.
2. **Payment Methods**:
   - Enable the desired payment channels (bKash, Nagad, Rocket, Cards, etc.) in your Paymently brand settings.
3. **Webhook / IPN URL** (if configured at brand level):
   - Webhook URL: `https://<your-production-domain>/api/payments/paymently/webhook`
   - Note: Each checkout request also passes `webhook_url` dynamically based on the request origin.
4. **Domain / Callback Whitelisting** (if required by your Paymently plan):
   - Whitelist your production domain (e.g. `https://rfcgadget.vercel.app` or your custom domain) and `http://localhost:3000` for local testing.

---

## 7. Local Testing Instructions

1. Add `UDDOKTA_PAY_BASE_URL` and `UDDOKTA_PAY_API_KEY` to `.env.local`.
2. Start the dev server: `npm run dev`.
3. Add a product to cart, go to `/checkout`, select **Pay Online (Paymently)**, and click **Pay Now**.
4. Note: Paymently cannot reach `http://localhost:3000/api/payments/paymently/webhook` from the internet unless you use a tunnel (e.g. `ngrok`). However, redirect-based server verification (`/order-success/[orderNumber]?invoice_id=...` -> `POST /api/payments/paymently/verify`) works locally without a tunnel.

---

## 8. Vercel Deployment & Production Activation Checklist

- [ ] Set `UDDOKTA_PAY_BASE_URL=https://rfcgadget.paymently.io/api` in Vercel Environment Variables.
- [ ] Set `UDDOKTA_PAY_API_KEY` in Vercel Environment Variables.
- [ ] Ensure `AUTH_SECRET` is set in Vercel Environment Variables (used to sign guest `paymentToken`s).
- [ ] Verify `/api/payments/paymently/webhook` is publicly reachable (no Vercel Deployment Protection / SSO blocking external POSTs in Production).
- [ ] Run a small live/sandbox test order and verify the order updates to `Paid` in `/admin/orders`.

---

## 9. Known Limitations

- Paymently (`UDDOKTA_PAY_BASE_URL=https://rfcgadget.paymently.io/api`) does not expose a separate sandbox key unless configured on a sandbox subdomain (`https://sandbox.uddoktapay.com/api`). Test against sandbox credentials before switching to live credentials.
- Automated refunds from RFC Gadget Admin to Paymently are not included because Paymently's v2 API documentation covers checkout and verification (`checkout-v2`, `verify-payment`) rather than programmatic refunds.
