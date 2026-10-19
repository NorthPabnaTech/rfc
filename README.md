# RFC Gadget

**Smart gadgets, delivered.** A dropshipping ecommerce store and admin panel for
RFC Gadget (Hazipara, Uttor Badda, Dhaka · 01330363517), built with Next.js 16,
MongoDB and Cloudinary.

- **Storefront:** ecommerce homepage (promotional banner slider, categories,
  featured, new arrivals, hot deals, combo offers, special offer banner,
  popular products, customer reviews); search, category, tag, price and
  availability filters; product cards with discount badge, rating, wishlist
  and add-to-cart; product pages with gallery, variations, specs, combo
  contents, reviews and Q&A; `/combo-offers`; wishlist; cart; Cash on Delivery
  checkout (guest or signed-in); order tracking; customer accounts with
  profile photo, address book, order history, cancellation (before
  confirmation) and return requests (rules on `/return-policy` only).
- **Admin panel:** dashboard with revenue analytics and profit; products with
  mixed Cloudinary-uploaded and supplier-URL images; **promotional banners**
  (position, schedule, enable/disable); **combo offers** (bundle pricing with
  per-supplier fulfilment details); categories and sub-categories, tags,
  suppliers; orders with a guarded status flow; manual orders per platform
  (Facebook, Messenger, Instagram, TikTok, WhatsApp…); returns; customers;
  review moderation; question answering; store settings.

## Getting started

Requirements: Node.js ≥ 20.11, a MongoDB database (e.g. Atlas), a Cloudinary
account.

```bash
npm install
cp .env.example .env.local      # then fill in the values
npm run seed                    # admin account, suppliers, settings, categories
npm run dev                     # http://localhost:3000
```

Sign in at `/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env.local`;
admins land on `/admin`. **Change the admin password after first login**
(Account → Change password).

`npm run seed` is idempotent. It skips the starter category tree if any
categories exist; pass `-- --no-categories` to never create it.

### Demo data (development)

```bash
npm run seed:demo              # fill an empty database with a realistic demo store
npm run seed:demo -- --reset   # wipe ALL store data and recreate the demo
```

Creates 29 products with real photos (Cloudinary `RFC-Gadget/products/seed/`),
4 categories + 10 sub-categories, 2 suppliers, tags, 3 combo offers,
7 banners (`RFC-Gadget/banners/`), 33 orders in every status across platforms,
reviews, product Q&A and pending/approved/rejected return requests.

| Account              | Email                                                                        | Password          |
| -------------------- | ---------------------------------------------------------------------------- | ----------------- |
| Admin                | `admin@rfcgadget.com`                                                        | `RfcGadget@12345` |
| Customer             | `customer@rfcgadget.com`                                                     | `Customer@12345`  |
| Other demo customers | `nusrat@`, `tanvir@`, `farzana@`, `sabbir@`, `mehedi@`, `ayesha@example.com` | `Customer@12345`  |

The script refuses to touch a database that already has products or orders
unless you pass `--reset`, and refuses `--reset` when `NODE_ENV=production`.
Images use fixed Cloudinary ids, so re-runs reuse them. **Before going live,
use a fresh database for production (or wipe the demo data first)
and change every demo password.**

### Environment variables

| Variable                                             | Purpose                                  |
| ---------------------------------------------------- | ---------------------------------------- |
| `MONGODB_URI`                                        | MongoDB connection string                |
| `MONGODB_DB`                                         | Database name (default `rfc_gadget`)     |
| `AUTH_SECRET`                                        | ≥ 32 random chars; signs session cookies |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Image uploads                            |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`                  | Same cloud name, for browser URLs        |
| `NEXT_PUBLIC_SITE_URL`                               | Public URL (SEO, sitemap)                |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD`      | First admin, used by `npm run seed`      |

Secrets live only in `.env.local` (git-ignored). In production, set them in
your host's environment settings.

## Scripts

| Command                                         |                                                                                                          |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm run dev` / `build` / `start`               | Next.js                                                                                                  |
| `npm run lint` / `typecheck` / `format`         | Quality                                                                                                  |
| `npm run seed`                                  | Bootstrap data                                                                                           |
| `npm run seed:demo [-- --reset]`                | Realistic development demo store (see above)                                                             |
| `MONGODB_DB=rfc_gadget_test npm run test:smoke` | End-to-end business-rule test. Refuses to run unless the DB name ends in `_test`; cleans up after itself |

## Images

- **Uploads** go to Cloudinary folders `RFC-Gadget/products`, `RFC-Gadget/users`,
  `RFC-Gadget/reviews`, `RFC-Gadget/returns` (plus `categories`, `banners`). They're
  resized on upload and served with `f_auto,q_auto` at the rendered width, so
  browsers get AVIF/WebP.
- **External URLs** (supplier photos) are stored as `{ type: "external", url }`
  and rendered directly. Uploaded and external images can be mixed and
  reordered; the first image is the cover.

## Deployment

Deploys anywhere Next.js runs (Vercel recommended). Set the environment
variables, allow your host's IPs in MongoDB Atlas Network Access, set
`NEXT_PUBLIC_SITE_URL` to the real domain, and run `npm run seed` once against
the production database.

See [`docs/architecture.md`](./docs/architecture.md) for how the code is
organized.
