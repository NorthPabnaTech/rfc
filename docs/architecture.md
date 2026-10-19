# RFC Gadget architecture

## Folder structure

```
src/
├── app/                         Routes only (App Router)
│   ├── layout.tsx               Root: fonts, metadata, providers
│   ├── (public)/                Storefront — header/footer/cart drawer layout
│   │   ├── page.tsx             Home
│   │   ├── products/            Listing (+ components/, loading.tsx)
│   │   │   └── [slug]/          Product detail (+ components/)
│   │   ├── cart/ checkout/ order-success/[orderNumber]/ track-order/
│   │   ├── account/             Profile, addresses/, orders/, orders/[id]/
│   │   └── contact/ return-policy/
│   ├── (auth)/login, register   Split-screen auth layout
│   ├── admin/                   Admin shell (sidebar) + every admin screen
│   ├── api/upload/route.ts      Multipart image upload → Cloudinary
│   ├── sitemap.ts robots.ts not-found.tsx error.tsx icon.png …
├── actions/                     Server Actions ('use server') — auth, account,
│                                checkout, admin
├── services/                    Business logic + data access (server-only)
├── database/                    Mongoose connection + one file per model
├── components/  ui/ form/ shared/ common/ icon/   Reusable design system
├── features/                    Domain UI reused across routes
│                                (products, cart, orders, uploads)
├── hooks/  providers/  stores/  Client helpers; zustand cart store
├── lib/                         auth/, validators/, constants, cloudinary,
│                                env, errors, images, utils/
├── config/site.ts               Brand constants
├── types/                       DTOs shared by server and client
└── proxy.ts                     Optimistic auth gate for /admin and /account
```

## Request flow

- **Reads:** a Server Component page calls a service
  (`services/products.ts → searchProducts`), which queries Mongoose and returns
  DTOs. List filters live in the URL (`?category=…&page=2`), so every list is
  server-rendered and shareable.
- **Writes:** a client form validates with the shared Zod schema and calls a
  Server Action. The action re-checks auth, re-parses the input, calls the
  service and revalidates the affected paths. Errors come back as
  `ActionResult` and are shown by `handleActionResult`.
- **Uploads:** `ImageUploader` posts files to `/api/upload`, which checks the
  session and the folder whitelist and returns Cloudinary assets. The form
  then submits those assets, and services verify they belong to our cloud and
  the right folder.

## Data model (MongoDB)

User, Address, Supplier, Category (two levels via `parent`), Tag, Product,
Order (with embedded **OrderItem** snapshots), Review, Question,
ReturnRequest, Banner (promotions by position + optional schedule),
Settings (singleton), Counter (sequential `NV-100001` order numbers).

**Combos** are Products with `type: 'combo'` and `comboItems` (product +
quantity), so cart, checkout, orders, reviews and Q&A need no special cases.
`price` = items bought separately, `salePrice` = bundle price, `supplierPrice`
= the items' total cost. Combo order lines snapshot their `components` (name,
quantity, supplier, supplier URL) for fulfilment. Normal catalog listings
exclude combos; they live on the homepage section and `/combo-offers`.

The **wishlist** is client-side (zustand + localStorage); `/wishlist` fetches
fresh prices for the saved ids.

Product images are `{ type: 'cloudinary' | 'external', url, publicId? }[]`.
Order items copy name, price, supplier and supplier cost at order time, so
later product edits never change past orders, and profit can be reported.

## Business rules (see `lib/constants.ts`)

- Status flow: Pending → Confirmed → Processing → Shipped → Delivered →
  Completed. Admins move one step at a time and may cancel until shipped.
  Delivery marks COD orders paid.
- Customers may cancel only while the order is **Pending**; the check is atomic.
- Returns: within **7 days** of delivery, one per order. Return rules are only
  described on `/return-policy` — never promised elsewhere on the storefront. Approval sets the
  order to _Returned_; refunds set payment to _refunded_.
- Reviews: only customers with a delivered order containing the product, once
  per product. Hidden reviews don't count toward the rating.
- Questions: public once answered; the asker always sees their own.
- Guest orders are linked to an account registered later with the same phone.

## Security

- Sessions: HS256 JWT in an httpOnly, SameSite=Lax cookie (secure in
  production). `proxy.ts` is only a fast gate; every protected page and action
  re-verifies the user in the DB (disabled accounts lose access at once).
- Passwords: bcrypt (cost 12), with constant-time responses for unknown emails.
- All input is validated with Zod. Product HTML is sanitized
  (`sanitize-html`). Regex searches are escaped. Post-login redirects only
  allow same-site paths.
- Admin-only fields (supplier cost, admin notes) never reach customer DTOs.

## Migration record (from the Kasmeri React SPA)

The repo started as "Kasmeri", a Vite + React Router + Redux restaurant UI
running on mock data. The migration:

1. **Kept** the design system (`components/ui`, `form`, `shared`, icon
   registry, tokens, utils, toast) and adapted it to Next.js: `'use client'`
   where needed, `next/link` / `next/navigation` instead of react-router, and
   brand tokens re-skinned to RFC Gadget navy + blue.
2. **Removed** all 22 restaurant modules, the `modules/` pattern, React
   Router, route config and guards, the Redux store and RTK mock API, the RBAC
   role switcher, the Vite config, old docs and agent skills, and unused
   hooks, components and dependencies.
3. **Added** the App Router tree, MongoDB models, services, server actions,
   auth, Cloudinary, and the storefront and admin screens.
