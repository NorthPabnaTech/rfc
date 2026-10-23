# RFC Gadget — Gadget Dropshipping Ecommerce (Next.js)

RFC Gadget is a production ecommerce store + admin panel for a Bangladeshi
gadget dropshipping business. It is a sibling of the Novelo store (same code
base, same MongoDB cluster and Cloudinary account) but fully separate data:
database `rfc_gadget`, Cloudinary folder `RFC-Gadget/`, its own session
cookie and browser-storage keys. Products are added **manually** by the admin from
supplier websites (ShopBase BD, Merrono, more later), sold at the admin's own
price, and paid **Cash on Delivery**. Admins also create manual orders for
sales made on Facebook/Messenger/Instagram/TikTok/WhatsApp.

Architecture and the migration record: [`docs/architecture.md`](./docs/architecture.md).
Setup and operations: [`README.md`](./README.md).

## Stack

Next.js 16 (App Router, Turbopack, `src/proxy.ts` — v16's renamed middleware) ·
React 19 · TypeScript (strict) · Tailwind CSS v4 (tokens in
`src/styles/tokens.css`) · MongoDB + Mongoose 9 · Cloudinary · Zod 4 ·
react-hook-form · zustand (cart only) · jose + bcryptjs (auth).

> Next.js 16 differs from older versions. Before using an unfamiliar API, read
> the bundled docs in `node_modules/next/dist/docs/` (`params`/`searchParams`
> are Promises, `middleware` is now `proxy`, etc.).

## Rules for every coding agent

1. **Do not recreate what exists — reuse it.** Before writing a component,
   check these first:
   - `src/components/ui/*` — design-system primitives (Button incl. `primary`
     blue / `noir` navy variants, Select, Dialog, Sheet, DataTable, Tabs,
     RichTextEditor, Checkbox, Switch, Dropdown…)
   - `src/components/form/*` — `Form`, `FormInput`, `FormSelect`,
     `FormCurrency`, `FormTextarea`, `FormSwitch`, `Form.List`, `FormItem`
     (render-prop for custom controls). Pass a Zod `schema` to `Form.useForm`.
   - `src/components/shared/*` — PageHeader, StatCard, StatusBadge,
     ConfirmDialog, FormSection, FilterBar, SearchInput, EmptyState, Callout…
   - `src/components/common/*` — Logo, Pager (link pagination), ChipInput,
     ChipMultiSelect
   - `src/features/*` — ProductCard/Grid, ProductImage (Cloudinary + external),
     Price/Taka, RatingStars, ImageUploader (Cloudinary upload + URLs), order
     badges/timeline/items, cart QuantityStepper/QuickAdd, NotificationBell
   - `src/hooks/use-url-filters.ts` — list filters/pagination in the URL
   - `src/lib/action-client.ts` — `handleActionResult` (toast + field errors)
2. **Next.js App Router only.** No React Router, no route config arrays, no
   `modules/` folder. Routes are folders under `src/app`; a route's private
   components live in its own `components/` folder next to `page.tsx`.
3. **Server Components by default.** Add `'use client'` only for state,
   effects, event handlers or browser APIs. Pages fetch data by calling
   `src/services/*` directly — never `fetch` your own API from a page.
4. **Mutations are Server Actions** in `src/actions/*`. Every action:
   `requireUser()` / `requireAdmin()` → `schema.parse(input)` → service →
   `revalidatePath(...)`, wrapped in `runAction()` so it returns
   `ActionResult` (`{ ok, data } | { ok: false, error, fieldErrors }`).
   The only Route Handler is `POST /api/upload` (multipart → Cloudinary).
   Notifications: call `services/notifications.ts` (`notify*` helpers — they
   store + push over Pusher and never throw) from the service that changes
   the data; Pusher private-channel auth is a server action, not a route.
5. **Layering:** `app` → `actions` → `services` → `database`. Pages and
   components never import Mongoose models; services return DTOs from
   `src/types` (string ids, ISO dates), mapped in `services/mappers.ts`.
6. **Never trust the client.** Prices, totals, stock and variants are
   recomputed server-side (`services/orders.ts`). Admin-only data
   (supplier price, cost, admin notes) is stripped from customer DTOs.
7. **Validation** lives in `src/lib/validators/*` (Zod) and is shared by forms
   and actions. Forms use `z.input<>` types; services take `z.output<>`.
8. **Business constants** (order statuses + allowed transitions, platforms,
   return window, Cloudinary folders) are in `src/lib/constants.ts` — change
   rules there, not inline.
9. **Dates** render in Dhaka time via `formatStoreDate` / `formatStoreDateTime`.
10. **Styling:** semantic tokens only (`bg-panel`, `text-ink`, `bg-brand`,
    `bg-noir`, `text-accent`, `font-display`…). Brand blue (`bg-brand`) takes
    white text (`text-brand-contrast`); star ratings use `text-warning-500`.
11. **Icon + text rows** use `IconText` (+ `IconMedallion`) from
    `components/common/icon-text.tsx` — never hand-tuned margins. It centres
    the letters (not the font's line box) on the icon via the `cap-trim`
    utility (`text-box: trim-both cap alphabetic`). Don't combine `cap-trim`
    with `truncate`/overflow-hidden (it clips descenders), and never name a
    custom utility `text-*` — `cn()`'s tailwind-merge treats it as a text
    colour and silently drops one of the two classes.
12. **Brand assets:** the `Logo` component pairs the RFC orbit mark
    (`public/brand/rfc-mark-light.png` for noir, `rfc-mark-dark.png` for light
    surfaces) with the GADGET wordmark — keep `MARK_RATIO` in sync if the mark
    image changes. Favicons (`src/app/favicon.ico`, `icon.png`,
    `apple-icon.png`) use the mark only, never the wordmark.
13. **Return rules** appear only on `/return-policy` (7 days,
    `RETURN_WINDOW_HOURS`); don't promise returns anywhere else.
14. **Typography scale** (in `globals.css`): `type-display` (storefront h1),
    `type-page-title`, `type-section-title` (dialog/drawer titles),
    `type-card-title`, `type-label`, `type-body`, `type-helper`,
    `type-caption`, `type-overline`. Use these instead of ad-hoc
    `text-[Npx] font-*` stacks for headings, labels and helper text.
15. **Form layout:** every field is label → control → helper/error, stacked
    in flow by `FormItem` (`gap-1.5`). Helper and error text use `FieldMessage`
    and are never absolutely positioned or truncated. Field grids use
    `gap-x-4 gap-y-5`. To align a button with inputs in a row, give it the same
    label row (an invisible `type-label` spacer), never `mt-[Npx]`.
16. **Dialogs** use `DialogHeader` / `DialogBody` (the only scrolling part) /
    `DialogFooter`. When a `<form>` wraps them it must be the direct child of
    `DialogContent`, so the footer stays pinned.
17. **Overflow:** layout grids use `minmax(0,…)` tracks (`grid-cols-1` on
    mobile, `lg:grid-cols-[minmax(0,1fr)_360px]`) so long words can't widen the
    page. Long table text uses DataTable columns with `wrap` + `minWidth`
    rather than truncating. `body` sets `overflow-wrap: break-word`.
18. **Navigation progress:** `NextTopLoader` (root layout) shows the top bar on
    `<Link>` clicks. For `router.push` / `router.replace`, import `useRouter`
    from `nextjs-toploader/app` (not `next/navigation`) so the bar shows too.

## Commands

```bash
npm run dev            # dev server
npm run build          # production build (type-checks app + scripts)
npm run lint           # eslint (next core-web-vitals + import sorting)
npm run typecheck      # tsc --noEmit
npm run seed           # create admin, suppliers, settings, starter categories
npm run seed:demo      # realistic demo store (empty DB); add -- --reset to recreate
MONGODB_DB=rfc_gadget_test npm run test:smoke   # business-rule E2E (test DB only)
```
