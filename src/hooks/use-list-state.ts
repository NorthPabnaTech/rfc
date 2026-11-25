'use client';

import * as React from 'react';

/**
 * Client-side list state for mock-data tables: search, filters, sort and
 * pagination in one place. In Phase 2 the same state is sent to the API as
 * query params, so pages keep their UI unchanged.
 */
export function useListState<T, F extends Record<string, string>>({
  rows,
  search,
  filters: filterFns,
  initialFilters,
  sorters,
  initialSort,
  pageSize = 10,
}: {
  rows: T[];
  /** Text fields to match the search query against. */
  search?: (row: T) => (string | number | undefined)[];
  /** One predicate per filter key; the value 'all' (or '') disables it. */
  filters?: { [K in keyof F]?: (row: T, value: F[K]) => boolean };
  initialFilters?: F;
  sorters?: Record<string, (a: T, b: T) => number>;
  initialSort?: string;
  pageSize?: number;
}) {
  const [query, setQuery] = React.useState('');
  const [filters, setFilters] = React.useState<F>(initialFilters ?? ({} as F));
  const [sort, setSort] = React.useState(initialSort ?? '');
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(pageSize);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter((row) => {
      if (q && search) {
        const hay = search(row).filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      for (const key in filters) {
        const value = filters[key];
        const fn = filterFns?.[key];
        if (!fn || value === undefined || value === '' || value === 'all') continue;
        if (!fn(row, value)) return false;
      }
      return true;
    });
    const sorter = sort && sorters?.[sort];
    if (sorter) out = [...out].sort(sorter);
    return out;
    // filterFns/search/sorters are inline functions; rows/query/filters/sort drive recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, filters, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / limit));
  const current = Math.min(page, pages);
  const pageRows = filtered.slice((current - 1) * limit, current * limit);

  const setFilter = React.useCallback(<K extends keyof F>(key: K, value: F[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }, []);

  return {
    query,
    setQuery: (q: string) => {
      setQuery(q);
      setPage(1);
    },
    filters,
    setFilter,
    resetFilters: () => {
      setFilters(initialFilters ?? ({} as F));
      setQuery('');
      setPage(1);
    },
    sort,
    setSort,
    page: current,
    setPage,
    limit,
    setLimit: (l: number) => {
      setLimit(l);
      setPage(1);
    },
    total: filtered.length,
    filtered,
    pageRows,
  };
}
