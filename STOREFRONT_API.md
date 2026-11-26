# Storefront Public API Documentation

This API lets a separate public storefront website (with its own brand name, logo, colors, and domain) connect to this `rfc-web` backend over HTTP — **no database credentials or admin panel required** on the second site. All orders placed from the second site land directly in this admin panel.

---

## 1. Main Backend Setup (`.env`)

Add these optional variables to your main `rfc-web` deployment:

```env
# Comma-separated allowed origins for CORS and Google OAuth redirect validation
STOREFRONT_ALLOWED_ORIGIN=https://your-second-site.com

# Default callback URL if redirect_uri is omitted
STOREFRONT_CALLBACK_URL=https://your-second-site.com/auth/callback

# Optional API key (if set, clients must send header: x-storefront-key: <key>)
STOREFRONT_API_KEY=your-optional-secret-key
```

### Google Cloud Console (for Google Login on the second site)
In your existing Google OAuth Client, add this **Authorized redirect URI**:
```text
https://your-main-site.com/api/storefront/auth/google/callback
```
*(In local dev: `http://localhost:3000/api/storefront/auth/google/callback` — `localhost` redirect URIs are allowed automatically when `NODE_ENV !== 'production'`.)*

---

## 2. Common Headers & Response Format

### Optional Headers
- `x-storefront-key: <STOREFRONT_API_KEY>` (only required if `STOREFRONT_API_KEY` is set on the server)
- `Authorization: Bearer <customer_jwt>` (for logged-in customer endpoints and attaching orders to a customer account)

### Response Envelope
- **Success:** `{ "ok": true, "data": ... }`
- **Error:** `{ "ok": false, "error": "Message", "fieldErrors"?: { "field": "Message" } }`

---

## 3. Endpoints

### `GET /api/storefront/bootstrap`
Returns store settings, active category tree, and active banners (ideal for layout + home page).

**Response `data`:**
```json
{
  "settings": { "...SettingsDTO" },
  "categories": [ "...CategoryTreeDTO[]" ],
  "banners": {
    "hero": [],
    "hero_side": [],
    "special": [],
    "combo": []
  }
}
```

---

### `GET /api/storefront/products`
Search and filter public products.

**Query Parameters (all optional):**
| Param | Type | Description |
| --- | --- | --- |
| `q` | string | Search query (max 80 chars) |
| `category` | string | Category or subcategory slug |
| `tags` | string | Comma-separated tag slugs |
| `minPrice` | number | Minimum price |
| `maxPrice` | number | Maximum price |
| `availability` | `'in_stock'` | Filter in-stock only |
| `onSale` | `'1'` \| `'true'` | Filter discounted products |
| `sort` | `'newest'` \| `'price_asc'` \| `'price_desc'` \| `'popular'` \| `'rating'` | Sort order |
| `page` | number | Page number (default `1`) |
| `pageSize` | number | Items per page (1–48) |

---

### `GET /api/storefront/products/[slug]`
Returns full product details, related products, reviews, and Q&A.

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

### `GET /api/storefront/combos`
Returns paginated combo offers.

**Query Parameters:**
- `page` (number, default `1`)

---

### `POST /api/storefront/cart/quote`
Calculates live prices, shipping fee, and coupon/campaign discounts.

**Request Body:**
```json
{
  "items": [
    {
      "productId": "65f...",
      "quantity": 1,
      "variant": { "Color": "Black" }
    }
  ],
  "zone": "inside_dhaka",
  "couponCode": "SAVE10"
}
```
*(Valid `zone` values: `"inside_dhaka"`, `"outside_dhaka"`.)*

---

### `POST /api/storefront/orders`
Places a website order directly into the main backend & admin panel.
- If `Authorization: Bearer <customer_jwt>` is included, the order is linked to that customer's account.
- Without `Authorization`, it creates a guest order.

**Request Body:**
```json
{
  "items": [
    {
      "productId": "65f...",
      "quantity": 1,
      "variant": { "Color": "Black" }
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

**Response `data` (`201 Created`):**
```json
{
  "orderNumber": "RFC-10042",
  "orderId": "674...",
  "paymentToken": "..."
}
```

---

### `GET` or `POST /api/storefront/orders/track`
Track an order by `orderNumber` and `phone`.
- `GET /api/storefront/orders/track?orderNumber=RFC-10042&phone=01712345678`
- `POST /api/storefront/orders/track` with `{ "orderNumber": "RFC-10042", "phone": "01712345678" }`

---

## 4. Google Login (External Storefront)

### Step 1: Redirect user to Google Login
On your second site's "Continue with Google" button, link/redirect the browser to:
```text
https://your-main-site.com/api/storefront/auth/google?redirect_uri=https://your-second-site.com/auth/callback
```

### Step 2: Handle the callback on your second site
After Google sign-in succeeds, the backend redirects back to:
- **Success:** `https://your-second-site.com/auth/callback?token=<JWT>`
- **Error:** `https://your-second-site.com/auth/callback?error=<error_code>`

Save `token` on the second site (e.g. `localStorage` or an HttpOnly cookie via a Next.js Route Handler) and send it as:
```text
Authorization: Bearer <token>
```

### `GET /api/storefront/auth/me`
Requires `Authorization: Bearer <token>`. Returns the signed-in customer profile:
```json
{
  "id": "674...",
  "name": "Rahim Uddin",
  "email": "rahim@example.com",
  "phone": "01712345678",
  "avatarUrl": "https://..."
}
```

### `GET /api/storefront/orders/my`
Requires `Authorization: Bearer <token>`. Returns all orders placed by the signed-in customer (`OrderRowDTO[]`).
