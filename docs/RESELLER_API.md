# RFC Gadget — Reseller Platform API Documentation

This document describes the REST API exposed by **RFC Gadget (`rfc-web`)** for your separate **Reseller Website**.

> **Architecture Note for the Reseller Site**
> - **No Admin Panel** is needed on the reseller site (all admin operations—approving deposits/withdrawals, activating/deactivating resellers, setting product margins, forwarding orders to suppliers, replying to tickets—happen in RFC Gadget's `/admin`).
> - The reseller site should have:
>   1. **Public Storefront Pages**: Home / Catalog / Product Detail (shows products **without prices** until the reseller signs in), Login, Register.
>   2. **Reseller Panel (Authenticated)**: Dashboard (KPIs + charts), Products (with reseller price, packaging & delivery charges), Place Order, My Orders & Profit Tracking, Wallet (Add Balance, Withdraw, Transaction History), Support Tickets, Profile & Payout Settings.

---

## 1. Base URL & Authentication

- **Base URL (Local Dev):** `http://localhost:3000/api/reseller`
- **Base URL (Production):** `https://your-rfc-domain.com/api/reseller`
- **CORS:** All `/api/reseller/*` endpoints support `OPTIONS` preflight and CORS headers. Set `RESELLER_ALLOWED_ORIGIN` in `rfc-web`'s `.env` (CORS defaults to `*`). Google sign-in only redirects the token to origins in `RESELLER_ALLOWED_ORIGIN` / `RESELLER_SITE_CALLBACK_URL` (plus localhost in development).
- **Authentication Header:**
  ```http
  Authorization: Bearer <token>
  ```
- **Standard Response Format:**
  - Success: `{ "ok": true, "data": { ... } }`
  - Error: `{ "ok": false, "error": "Human-readable error message" }`

---

## 2. Authentication & Profile Endpoints (Google-Only Login)

> **Google-Only Sign-In:** Resellers can **only** sign in using Google. `POST /api/reseller/auth/login` and `POST /api/reseller/auth/register` return `403` (`"Resellers can only sign in with Google."`).

### 2.1 Google OAuth Redirect Flow (Recommended)
1. On your reseller site's **"Continue with Google"** button, redirect the browser to:
   ```
   GET http://localhost:3000/api/reseller/auth/google?redirect_uri=http://localhost:3001/auth/callback
   ```
   *(In Google Cloud Console, ensure `http://localhost:3000/api/reseller/auth/google/callback` — and your production callback URL — is added to **Authorized redirect URIs**.)*
2. After Google login, `rfc-web` creates/finds the reseller account, checks `isActive`, generates a Bearer JWT, and redirects back to:
   ```
   http://localhost:3001/auth/callback?token=<jwt_token>
   ```
   Or on error/deactivated account:
   ```
   http://localhost:3001/auth/callback?error=account_disabled
   ```
3. Your `/auth/callback` page saves `token` (e.g. in `localStorage`/cookie) and calls `GET /api/reseller/auth/me` with `Authorization: Bearer <token>`.

---

### 2.2 Google ID Token Exchange (Alternative for One Tap / `@react-oauth/google`)
`POST /api/reseller/auth/google`

**Request Body:**
```json
{
  "idToken": "<google_id_token_from_client>"
}
```

**Response (`200 OK`):**
```json
{
  "ok": true,
  "data": {
    "token": "<jwt_token>",
    "reseller": {
      "id": "674...",
      "name": "Rahim Uddin",
      "shopName": "Rahim Uddin's Shop",
      "email": "rahim@example.com",
      "phone": null,
      "avatarUrl": "https://...",
      "address": null,
      "isActive": true,
      "walletBalance": 0,
      "payoutDetails": {}
    }
  }
}
```

---

### 2.3 Get Current Reseller Profile
`GET /api/reseller/auth/me` *(Auth Required)*

**Response (`200 OK`):**
```json
{
  "ok": true,
  "data": {
    "id": "674...",
    "name": "Rahim Uddin",
    "shopName": "Rahim Gadget Hub",
    "email": "rahim@example.com",
    "phone": "01712345678",
    "address": "Mirpur 10, Dhaka",
    "isActive": true,
    "walletBalance": 500,
    "totalDeposited": 1000,
    "totalWithdrawn": 200,
    "totalProfitEarned": 450,
    "totalSales": 3200,
    "totalOrders": 4,
    "payoutDetails": {
      "bkash": "01712345678"
    },
    "createdAt": "2026-11-24T15:00:00.000Z"
  }
}
```

---

### 2.4 Update Reseller Profile / Payout Details
`PATCH /api/reseller/auth/me` *(Auth Required)*

**Request Body (all fields optional):**
```json
{
  "name": "Rahim Uddin",
  "shopName": "Rahim Gadget Store",
  "address": "Dhanmondi, Dhaka",
  "payoutDetails": {
    "bkash": "01712345678",
    "nagad": "01812345678",
    "bankInfo": "DBBL A/C 123456789"
  }
}
```

---

## 3. Product Catalog Endpoints (Price-Gated)

Only products enabled by the admin (`resellerEnabled: true` & `published`) are returned.
- **Without `Authorization` header:** Price fields are **completely omitted** (`authenticated: false`). Show a *"Sign in to view reseller price"* prompt in your UI.
- **With valid `Authorization: Bearer <token>`:** Returns `resellerPrice` (`supplierPrice + adminProfit`), `suggestedRetailPrice`, `packagingCost`, and `deliveryCharges` (`authenticated: true`).

### 3.1 List Reseller Products
`GET /api/reseller/products?q=watch&category=<id>&page=1&limit=20` *(Auth Optional)*

**Response (Unauthenticated):**
```json
{
  "ok": true,
  "authenticated": false,
  "data": {
    "items": [
      {
        "id": "674...",
        "name": "S11 Plus 5G Android Watch",
        "slug": "s11-plus-5g-android-watch",
        "sku": "WATCH-S11",
        "shortDescription": "...",
        "description": "<p>...</p>",
        "category": { "id": "674...", "name": "Smart Watches", "slug": "smart-watches" },
        "images": [{ "url": "https://...", "alt": "S11 Plus" }],
        "variations": [{ "name": "Color", "values": ["Black", "Silver"] }],
        "specifications": [{ "label": "Display", "value": "AMOLED" }],
        "stockStatus": "in_stock",
        "stockQuantity": 25
      }
    ],
    "total": 12,
    "page": 1,
    "totalPages": 1
  }
}
```

**Response (Authenticated — extra fields included on each item):**
```json
{
  "resellerPrice": 250,
  "suggestedRetailPrice": 450,
  "packagingCost": 20,
  "deliveryCharges": {
    "insideDhaka": 70,
    "outsideDhaka": 130
  }
}
```

---

### 3.2 Get Single Product by Slug
`GET /api/reseller/products/[slug]` *(Auth Optional)*

Returns `{ "ok": true, "authenticated": boolean, "data": { ...product } }` with the same price-gating rules.

---

## 4. Wallet & Transactions Endpoints

- **Minimum Add Balance:** `৳100`
- **Minimum Withdrawal:** `৳50`

### 4.1 Get Wallet Summary
`GET /api/reseller/wallet` *(Auth Required)*

**Response (`200 OK`):**
```json
{
  "ok": true,
  "data": {
    "walletBalance": 500,
    "totalDeposited": 1000,
    "totalWithdrawn": 200,
    "totalProfitEarned": 450,
    "minDeposit": 100,
    "minWithdrawal": 50
  }
}
```

---

### 4.2 Get Transaction History
`GET /api/reseller/wallet/transactions?page=1&limit=20&type=&status=` *(Auth Required)*

- Optional `type`: `deposit` | `withdrawal` | `order_deduction` | `order_profit` | `order_refund` | `admin_adjustment`
- Optional `status`: `pending` | `completed` | `rejected` | `failed`

**Response (`200 OK`):**
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "674...",
        "txNumber": "WTX-100001",
        "type": "order_deduction",
        "direction": "debit",
        "amount": 90,
        "balanceBefore": 590,
        "balanceAfter": 500,
        "status": "completed",
        "orderNumber": "RFC-100025",
        "paymentMethod": null,
        "paymentReference": null,
        "payoutMethod": null,
        "payoutAccount": null,
        "note": "Delivery (৳70) + Packaging (৳20) for RFC-100025",
        "createdAt": "2026-11-24T15:10:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "totalPages": 1
  }
}
```

---

### 4.3 Add Balance (Deposit Request)
`POST /api/reseller/wallet/deposit` *(Auth Required)*

**Request Body:**
```json
{
  "amount": 500,
  "paymentMethod": "bkash",
  "paymentReference": "TRX8A9B1234",
  "note": "Sent from 01712345678"
}
```
- `amount` must be `>= 100`.
- Creates a `pending` deposit transaction. Once approved by admin in RFC Gadget, `walletBalance` is credited automatically.

**Response (`201 Created`):**
```json
{
  "ok": true,
  "data": {
    "id": "674...",
    "txNumber": "WTX-100002",
    "amount": 500,
    "status": "pending",
    "paymentMethod": "bkash",
    "paymentReference": "TRX8A9B1234",
    "createdAt": "2026-11-24T15:15:00.000Z"
  }
}
```

---

### 4.4 Request Withdrawal
`POST /api/reseller/wallet/withdraw` *(Auth Required)*

**Request Body:**
```json
{
  "amount": 200,
  "payoutMethod": "bKash",
  "payoutAccount": "01712345678",
  "note": "Personal bKash"
}
```
- `amount` must be `>= 50` and `<= walletBalance`.
- Immediately holds (deducts) the amount from `walletBalance` and creates a `pending` withdrawal. If admin rejects it, the amount is automatically refunded to `walletBalance`.

**Response (`201 Created`):**
```json
{
  "ok": true,
  "data": {
    "id": "674...",
    "txNumber": "WTX-100003",
    "amount": 200,
    "status": "pending",
    "payoutMethod": "bKash",
    "payoutAccount": "01712345678",
    "walletBalance": 300,
    "createdAt": "2026-11-24T15:20:00.000Z"
  }
}
```

---

## 5. Reseller Orders Endpoints

### Business Rules
1. When placing an order, the system calculates `upfrontCost = deliveryCharge + packagingCost` based on the customer's shipping zone (`inside_dhaka` vs `outside_dhaka`) and product settings.
2. **Wallet Check:** If `walletBalance < upfrontCost`, the API rejects the order with `400 Insufficient wallet balance`.
3. If sufficient, `upfrontCost` is atomically deducted from the reseller's wallet, the order is created (`platform: "reseller"`), and a `SupplierOrder` is queued so the admin can forward it to the upstream supplier in one click.
4. `sellingPrice` per item must be `>= resellerPrice`.
5. When the order is marked **delivered**, `expectedResellerProfit` (`sellingTotal - resellerPriceTotal`) is automatically credited to the reseller's wallet. If **cancelled** before shipping, `upfrontCost` is refunded.

### 5.1 Place Reseller Order
`POST /api/reseller/orders` *(Auth Required)*

**Request Body:**
```json
{
  "customer": {
    "name": "Karim Mia",
    "phone": "01811223344",
    "email": "karim@example.com"
  },
  "shippingAddress": {
    "division": "Dhaka",
    "district": "Dhaka",
    "area": "Mirpur",
    "street": "House 12, Road 4, Block B"
  },
  "items": [
    {
      "productId": "674...",
      "quantity": 1,
      "sellingPrice": 400,
      "variant": { "Color": "Black" }
    }
  ],
  "customerNote": "Call before delivery"
}
```

**Response (`201 Created`):**
```json
{
  "ok": true,
  "data": {
    "id": "674...",
    "orderNumber": "RFC-100026",
    "status": "pending",
    "total": 470,
    "resellerSummary": {
      "resellerPriceTotal": 250,
      "resellerSellingTotal": 400,
      "deliveryCharge": 70,
      "packagingCost": 20,
      "upfrontDeducted": 90,
      "expectedResellerProfit": 150,
      "profitCredited": false,
      "upfrontRefunded": false
    },
    "createdAt": "2026-11-24T15:25:00.000Z"
  }
}
```

---

### 5.2 List Reseller Orders
`GET /api/reseller/orders?page=1&limit=20&status=` *(Auth Required)*

---

### 5.3 Get Order Details & Tracking
`GET /api/reseller/orders/[id]` *(Auth Required)*

Includes `statusHistory`, `resellerSummary` (profit breakdown), and `supplierTracking` (delivery/courier sync status).

---

## 6. Dashboard Statistics & Chart Data

### Get Dashboard Stats & Chart Series
`GET /api/reseller/dashboard?days=30` *(Auth Required)*

- `days`: between `7` and `90` (default `30`).

**Response (`200 OK`):**
```json
{
  "ok": true,
  "data": {
    "walletBalance": 500,
    "totalDeposited": 1000,
    "totalWithdrawn": 200,
    "totalProfitEarned": 450,
    "totalSales": 3200,
    "totalOrders": 8,
    "statusCounts": {
      "pending": 2,
      "confirmed": 1,
      "processing": 1,
      "shipped": 1,
      "delivered": 3,
      "cancelled": 0,
      "returned": 0
    },
    "chart": [
      { "date": "2026-11-23", "orders": 2, "revenue": 800, "profit": 300 },
      { "date": "2026-11-24", "orders": 1, "revenue": 400, "profit": 150 }
    ]
  }
}
```
Use the `chart` array directly with Recharts / Chart.js on the Reseller Dashboard.

---

## 7. Support Tickets Endpoints

### 7.1 List Tickets
`GET /api/reseller/tickets?status=` *(Auth Required)*

### 7.2 Create Ticket
`POST /api/reseller/tickets` *(Auth Required)*

**Request Body:**
```json
{
  "subject": "Order delivery delay",
  "category": "Delivery",
  "priority": "high",
  "orderNumber": "RFC-100026",
  "message": "Customer has not received the parcel yet."
}
```
- `priority`: `low` | `medium` | `high` (default `medium`).
- `category` and `orderNumber` are optional.

### 7.3 Get Ticket Thread
`GET /api/reseller/tickets/[id]` *(Auth Required)*

### 7.4 Reply to Ticket
`POST /api/reseller/tickets/[id]/reply` *(Auth Required)*

**Request Body:**
```json
{
  "message": "Thank you, please update me once dispatched."
}
```

---

## Changelog — money & auth hardening

**`POST /wallet/deposit`**
- Paymently deposits: send `{ "invoiceId": "<paymently invoice_id>" }` only.
  - The server verifies the invoice with Paymently and credits the amount the gateway returns.
  - It credits only if all of these hold:
    - status is `COMPLETED`;
    - `metadata.type === "wallet_deposit"`;
    - `metadata.resellerId` is the signed-in reseller (the `id` from `GET /auth/me`);
    - the paid amount equals `metadata.amount`.
  - Response: `201` for a new credit. If the invoice was already credited, the response is `200` with the existing deposit and `alreadyCredited: true`.
  - Extra response fields: `invoiceId`, `walletBalance`, `alreadyCredited`.
- `{ amount, paymentMethod, paymentReference, note }` without `invoiceId` still works, but it only creates a **pending** request that an admin must approve. `amount` must now be a whole number.
- Create the Paymently invoice with:
  - `metadata: { type: "wallet_deposit", resellerId, amount }`;
  - `webhook_url: <rfc-web>/api/reseller/wallet/deposit/webhook`, so the wallet is credited even if the tab closes. It uses the same `UDDOKTA_PAY_API_KEY` account.

**`POST /orders`**
- `items[].quantity` and `items[].sellingPrice` must be whole numbers.
- New optional `items[].expectedResellerPrice`. If it differs from the current reseller price, the server returns `409` with "Price of … changed from ৳X to ৳Y".
- New `deliveryPaymentMode: "with_product" | "advance"`, default `with_product`. It replaces the free-text note: COD is selling total + delivery, or the selling total only when `advance`.
- Any client-sent delivery or packaging charge or zone is ignored.
- New `resellerSummary` fields: `deliveryPaymentMode`, `codAmount`, `codCollected`, `profitCreditedAmount`.
- Order items now carry `sellingPrice` and `resellerPrice` (snapshots).
- `GET /orders/:id` no longer returns supplier cost, supplier links, platform margin or admin ids in `items` and `statusHistory`.
- Profit on delivery is `expectedResellerProfit − max(0, codAmount − codCollected)`, taken from the order's own snapshots.

**`POST /wallet/withdraw`**
- `amount` must be a whole number.
- The fee comes from admin settings. The response includes `fee` and `netAmount`, and so do transaction rows.
- `GET /wallet` returns `withdrawalFeeTiers` for display.

**Auth**
- New `POST /auth/logout`. It revokes all of the account's tokens.
- Suspension also revokes tokens. Tokens carry a `ver` claim that is checked on every request.
- Google sign-in endpoints are rate-limited per IP.
