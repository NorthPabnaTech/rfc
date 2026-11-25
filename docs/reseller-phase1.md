# Reseller Platform — Phase 1 (frontend only)

Branch `feat/reseller-phase1-ui`. A complete frontend for the reseller /
dropshipping platform: public site, Super Admin panel and Seller panel, running
entirely on mock data in the browser. No database, payment gateway or real
authentication is touched.

## Run it

```bash
npm run dev            # http://localhost:3000
```

Open `/login`, choose **Seller** or **Super Admin** in the demo role selector and
press _Continue_. Demo data lives in `localStorage` (`resell-demo-v1`); reset it
from _Settings → Demo data_.

## Business rules (single source of truth: `src/lib/business/*`)

| Rule                                                                                                                            | Where                                   |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Seller base price = supplier cost + platform margin                                                                             | `pricing.ts`                            |
| Seller profit = (selling − base) × qty                                                                                          | `pricing.ts`, `orders.ts`               |
| Delivery (by area + bulky surcharge) and packaging are prepaid from the wallet **once**, at order placement; refunded on cancel | `orders.ts`, `stores/platform-store.ts` |
| Customer pays the selling price × qty (Cash on Delivery)                                                                        | `orders.ts`                             |
| Earnings stay pending 48 h after delivery, then become available                                                                | `wallet.ts`, `releaseDueEarnings`       |
| Add balance min ৳100 · Withdraw min ৳50 · fee ৳5 below ৳1,000, ৳10 above, configurable at exactly ৳1,000                        | `wallet.ts`, Settings → Business        |
| Revenue = product cost + platform profit + seller profit; Net profit = platform profit + charges + withdrawal fees − expenses   | `analytics.ts`                          |

Visibility: sellers receive `toSellerProduct()` (no supplier cost, margin or
supplier); the public site receives `toPublicProduct()` (no prices at all).

## Structure

```
src/app/(site)            public landing + /products showcase (no prices)
src/app/(auth)            login (demo role selector), register, forgot/reset, verify
src/app/admin/**          Super Admin panel (29 routes)
src/app/seller/**         Seller panel (21 routes)
src/components/layout     DashboardShell, Sidebar, Topbar (shared by both roles)
src/components/dashboard  Panel, KpiCard, ListToolbar, RangeFilter
src/components/charts     Recharts wrappers (validated, theme-aware palette)
src/components/platform   Money, StatusPill, ProductImage/Gallery, OrderTimeline,
                          InvoiceSheet/Actions, WalletSummary, TelegramCard,
                          switchers, notifications, table column factories
src/config                platform.ts (env placeholders), navigation.ts (both sidebars)
src/i18n                  en/bn dictionaries, provider (cookie locale), formatters
src/lib/business          pricing, orders, wallet, analytics, delivery
src/lib/validators/reseller.ts   Zod schemas (localised messages)
src/lib/api/client.ts     Phase 2 API client (unused in Phase 1)
src/mock                  catalog, people, settings, deterministic generator
src/stores/platform-store.ts     demo "backend": data + every mutation
```

## Design system

Palette from coolors `8ecae6 · 219ebc · 023047 · ffb703 · fb8500` in
`src/styles/tokens.css`; `.dark` overrides in `globals.css` (next-themes:
Light / Dark / System). Chart series colours were checked with the dataviz
palette validator for both themes. Fonts: Inter (English), Hind Siliguri
(Bangla), Anek Bangla (Bangla numerals through the `num` utility).

## Phase 2 — needs a backend

- Real authentication, sessions and role-based route protection (proxy + layouts)
- Database models and APIs for every store action (`src/lib/api/client.ts` lists the endpoints)
- Payment gateway for Add Balance; payout processing for withdrawals
- Server-side enforcement of every pricing/charge/wallet rule (never trust the client)
- Scheduled release of earnings after 48 h, courier integration and tracking codes
- Image upload/storage for products, email/SMS for verification and resets
- Persisting settings, Telegram links and notifications server-side
