import { z } from 'zod';

import { PRODUCT_SORTS } from '@lib/constants';

export type SearchParams = Record<string, string | string[] | undefined>;

/** First value of a query param. */
export function param(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v || undefined;
}

export function pageParam(sp: SearchParams): number {
  return z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .catch(1)
    .parse(param(sp, 'page') ?? 1);
}

const price = z.coerce.number().min(0).max(10_000_000).optional().catch(undefined);

export function parseProductFilters(sp: SearchParams) {
  return {
    q: param(sp, 'q')?.slice(0, 80),
    category: param(sp, 'category')?.slice(0, 120),
    tags: param(sp, 'tags')?.split(',').filter(Boolean).slice(0, 10),
    minPrice: price.parse(param(sp, 'minPrice')),
    maxPrice: price.parse(param(sp, 'maxPrice')),
    availability: param(sp, 'inStock') === '1' ? ('in_stock' as const) : undefined,
    onSale: param(sp, 'onSale') === '1',
    sort: z
      .enum(PRODUCT_SORTS)
      .catch('newest')
      .parse(param(sp, 'sort') ?? 'newest'),
    page: pageParam(sp),
  };
}

/** Build a URL for a page of the current listing, preserving other params. */
export function withParams(
  base: string,
  sp: SearchParams,
  updates: Record<string, string | number | undefined>,
) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val) next.set(k, val);
  }
  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined || v === '' || (k === 'page' && v === 1)) next.delete(k);
    else next.set(k, String(v));
  }
  const qs = next.toString();
  return qs ? `${base}?${qs}` : base;
}
