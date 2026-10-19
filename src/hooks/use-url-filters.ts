'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * List filters stored in the URL query string, so filtered pages are
 * server-rendered, shareable and survive refresh/back. Setting any filter
 * other than `page` resets pagination.
 */
export function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const get = React.useCallback((key: string) => params.get(key) ?? '', [params]);

  const set = React.useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === '') next.delete(key);
        else next.set(key, String(value));
      }
      if (!('page' in updates)) next.delete('page');
      const qs = next.toString();
      startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [params, pathname, router],
  );

  const clear = React.useCallback(
    (keep: string[] = []) => {
      const next = new URLSearchParams();
      keep.forEach((k) => params.get(k) && next.set(k, params.get(k)!));
      const qs = next.toString();
      startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [params, pathname, router],
  );

  return { get, set, clear, params, isPending };
}
