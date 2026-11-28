# Novelo Public Storefront API Documentation

This guide explains how to connect the separate **Novelo** frontend (frontend-only app) to this `rfc-web` backend over HTTP.

- **Products, Categories, Banners, and Combo Offers** are strictly separated per business — Novelo only sees Novelo items, and RFC Gadget only sees RFC Gadget items.
- **Customer Accounts & Addresses** are shared — a customer can log in on both sites with the same email/Google account or phone/password. Updating their name, phone, or saved addresses on one site updates them everywhere.
- **Orders** all arrive in the same Admin Panel with separate business tags and separate invoice prefixes (`INV-<PREFIX>-<SEQ>`).
- **Customer Order History** (`/api/storefront/orders/my`) is filtered by business so Novelo shows only the user's Novelo orders and RFC Gadget shows only their RFC Gadget orders.

---

## 1. One-Time Admin & Environment Setup

### A. Enable Public Storefront for Novelo in Admin
1. Open `/admin/businesses` in the admin panel.
2. Click **Edit** on **Novelo**.
3. Turn ON **Public Storefront (API)** and **Active**, then save.
   - Turning this ON automatically makes existing Novelo products `public` for the Novelo API (they will still never appear on RFC Gadget).
4. Note the **Slug** shown on the Novelo card (e.g. `novelo`). Use that exact slug in all API calls below.
5. In `/admin/categories`, `/admin/banners`, `/admin/products`, and `/admin/combos`, select **Novelo** as the Business / Store.

### B. Backend `.env` Configuration
```env
# Comma-separated allowed origins for CORS and Google OAuth redirect validation
STOREFRONT_ALLOWED_ORIGIN=https://novelo-frontend.com

# Default Google OAuth callback URL if redirect_uri is omitted
STOREFRONT_CALLBACK_URL=https://novelo-frontend.com/auth/callback

# Optional API key (if set, send header: x-storefront-key: <key>)
STOREFRONT_API_KEY=your-optional-secret-key
```

---

## 2. How to Scope Requests to Novelo

Pass the Novelo business slug on **every** request using either:
- **Header (recommended):** `x-business-slug: novelo`
- **Query parameter:** `?business=novelo`

*(If omitted, the API defaults to `rfc_gadget`.)*

### Common Headers
```http
Content-Type: application/json
x-business-slug: novelo
x-storefront-key: <STOREFRONT_API_KEY>        # Only if STOREFRONT_API_KEY is configured
Authorization: Bearer <customer_jwt>           # For logged-in customer endpoints
```

### Response Envelope
- **Success:** `{ "ok": true, "data": ... }`
- **Error:** `{ "ok": false, "error": "Message", "fieldErrors"?: { "field": "Message" } }`

---

## 3. Catalog & Storefront Endpoints

### `GET /api/storefront/bootstrap`
Returns Novelo's business metadata, store settings, active Novelo category tree, active Novelo banners, and active campaigns.

**Response `data`:**
```json
{
  "business": {
    "id": "...",
    "name": "Novelo",
    "slug": "novelo",
    "invoicePrefix": "NOV",
    "phone": "017...",
    "address": "...",
    "logo": { "url": "..." }
  },
  "settings": { "...SettingsDTO" },
  "categories": [ "...CategoryTreeDTO[] (Novelo only)" ],
  "banners": {
    "hero": [],
    "hero_side": [],
    "special": [],
    "combo": []
  },
  "campaigns": [ "...CampaignDTO[]" ]
}
```

---

### `GET /api/storefront/products`
Search and filter published Novelo products (excludes combos; combos have their own endpoint).

**Query Parameters (all optional):**
| Param | Type | Description |
| --- | --- | --- |
| `business` | string | Business slug (`novelo`), or send `x-business-slug: novelo` header |
| `q` | string | Search query (max 80 chars) |
| `category` | string | Novelo category or subcategory slug |
| `tags` | string | Comma-separated tag slugs |
| `minPrice` | number | Minimum price |
| `maxPrice` | number | Maximum price |
| `availability` | `'in_stock'` | Filter in-stock only |
| `onSale` | `'1'` \| `'true'` | Filter discounted products |
| `featured` | `'1'` \| `'true'` | Filter featured products |
| `sort` | `'newest'` \| `'price_asc'` \| `'price_desc'` \| `'popular'` \| `'rating'` | Sort order |
| `page` | number | Page number (default `1`) |
| `pageSize` | number | Items per page (`1`–`48`) |

---

### `GET /api/storefront/products/[slug]`
Returns full product details, related Novelo products, reviews, and Q&A. Returns `404` if the product belongs to RFC Gadget.

**Response `data`:**
```json
{
  "product": { "...ProductDetailDTO" },
  "related": [ "...ProductCardDTO[]" ],
  "reviews": [ "...ReviewDTO[]" ],
  "questions": [ "...QuestionDTO[]" ]
}
```

---

### `POST /api/storefront/products/[slug]/reviews`
*(Requires `Authorization: Bearer <customer_jwt>`)*  
Submits a product review on a Novelo product.

**Request Body:**
```json
{
  "rating": 5,
  "comment": "Great quality!"
}
```

---

### `POST /api/storefront/products/[slug]/questions`
*(Requires `Authorization: Bearer <customer_jwt>`)*  
Submits a question on a Novelo product.

**Request Body:**
```json
{
  "question": "Is this available in XL?"
}
```

---

### `GET /api/storefront/combos`
Returns paginated Novelo combo offers (both `type: 'combo'` bundles and products with `isComboOffer: true`).

**Query Parameters:**
- `page` (number, default `1`)

---

### `GET /api/storefront/campaigns`
Returns currently active promotional campaigns and coupon offers.

---

## 4. Cart & Checkout Endpoints

### `POST /api/storefront/cart/quote`
Calculates live prices, shipping fee, and coupon/campaign discounts for Novelo items.

**Request Body:**
```json
{
  "items": [
    {
      "productId": "65f...",
      "quantity": 1,
      "variant": { "Size": "L" }
    }
  ],
  "zone": "inside_dhaka",
  "couponCode": "SAVE10"
}
```
*(Valid `zone` values: `"inside_dhaka"`, `"outside_dhaka"`.)*

---

### `POST /api/storefront/orders`
Places a Novelo order directly into the shared admin panel (`business: "novelo"`, invoice prefix from Novelo's business settings).
- Include `Authorization: Bearer <customer_jwt>` to link the order to the logged-in customer.
- Omit `Authorization` for guest checkout.

**Request Body:**
```json
{
  "items": [
    {
      "productId": "65f...",
      "quantity": 1,
      "variant": { "Size": "L" }
    }
  ],
  "fullName": "Rahim Uddin",
  "phone": "01712345678",
  "email": "rahim@example.com",
  "addressLine": "House 12, Road 4, Banani",
  "division": "Dhaka",
  "area": "Banani",
  "city": "Dhaka",
  "zone": "inside_dhaka",
  "paymentMethod": "cod",
  "couponCode": "SAVE10",
  "customerNote": "Call before delivery"
}
```

**Response `data` (`201`):**
```json
{
  "orderNumber": "RFC-100025",
  "orderId": "65f...",
  "paymentToken": "..."
}
```

---

### `GET /api/storefront/order/[slug]` & `POST /api/storefront/order/[slug]`
Express single-product checkout (fetches product + saved addresses + shipping fees on `GET`, places order on `POST`).

---

### `GET /api/storefront/orders/track` & `POST /api/storefront/orders/track`
Public order tracking for Novelo orders using `orderNumber` + `phone`.

---

## 5. Customer Authentication & Shared Account

Customer accounts are **shared** across RFC Gadget and Novelo.

### `POST /api/storefront/auth/register`
Registers a new customer account and sends a verification email.

**Request Body:**
```json
{
  "name": "Rahim Uddin",
  "email": "rahim@example.com",
  "phone": "01712345678",
  "password": "password123"
}
```

---

### `POST /api/storefront/auth/login`
Logs in using email or Bangladesh phone number + password. Returns a 30-day JWT `token`.

**Request Body:**
```json
{
  "identifier": "rahim@example.com",
  "password": "password123"
}
```

**Response `data`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "65f...",
    "name": "Rahim Uddin",
    "email": "rahim@example.com",
    "phone": "01712345678",
    "avatarUrl": null
  }
}
```

---

### `POST /api/storefront/auth/forgot-password`
Sends a password reset email.

**Request Body:**
```json
{
  "email": "rahim@example.com"
}
```

---

### `GET /api/storefront/auth/google?redirect_uri=https://novelo-frontend.com/auth/callback`
Redirects the user to Google OAuth and then back to `redirect_uri` with `?token=<customer_jwt>` (or `?error=<code>`).

---

### `GET /api/storefront/auth/me` & `PATCH /api/storefront/auth/me`
*(Requires `Authorization: Bearer <customer_jwt>`)*  
Reads or updates the customer's shared `name` and `phone`. Changes reflect on both RFC Gadget and Novelo.

**`PATCH` Body:**
```json
{
  "name": "Rahim Uddin",
  "phone": "01712345678"
}
```

---

### `GET /api/storefront/addresses` & `POST /api/storefront/addresses`
### `PATCH /api/storefront/addresses/[id]` & `DELETE /api/storefront/addresses/[id]`
*(Requires `Authorization: Bearer <customer_jwt>`)*  
Manages the customer's shared saved delivery addresses.

---

## 6. Customer Orders (Separated by Business)

All endpoints below require `Authorization: Bearer <customer_jwt>` and `x-business-slug: novelo` (or `?business=novelo`). They **only** return/act on orders placed under Novelo.

### `GET /api/storefront/orders/my`
Lists the logged-in customer's Novelo orders.

### `GET /api/storefront/orders/my/[id]`
Returns full details for one Novelo order (by MongoDB `_id` or `orderNumber`).

### `POST /api/storefront/orders/my/[id]/cancel`
Cancels a `pending` Novelo order belonging to the logged-in customer.

**Request Body (optional):**
```json
{
  "reason": "Ordered by mistake"
}
```
