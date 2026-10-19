'use client';

import * as React from 'react';

import { FilterBar, FilterSelect, SearchInput } from '@components/shared';
import { useDebouncedValue } from '@hooks/use-debounced-value';
import { useUrlFilters } from '@hooks/use-url-filters';

export type ToolbarFilter = {
  /** Query-string key. */
  name: string;
  label: string;
  options: { value: string; label: string }[];
  width?: string;
};

/**
 * Standard admin list toolbar: a debounced search box plus select filters,
 * all synced to the URL so the server component re-renders the list.
 */
export function ListToolbar({
  search = true,
  searchPlaceholder = 'Search…',
  filters = [],
  actions,
}: {
  /** Show the search box (only where the list supports text search). */
  search?: boolean;
  searchPlaceholder?: string;
  filters?: ToolbarFilter[];
  actions?: React.ReactNode;
}) {
  const { get, set } = useUrlFilters();
  const [q, setQ] = React.useState(get('q'));
  const debounced = useDebouncedValue(q, 350);

  React.useEffect(() => {
    if (debounced !== get('q')) set({ q: debounced || null });
    // Only react to the user's typing, not to URL changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <FilterBar
      left={
        search ? (
          <SearchInput value={q} onChange={setQ} placeholder={searchPlaceholder} />
        ) : undefined
      }
      right={
        <>
          {filters.map((f) => (
            <FilterSelect
              key={f.name}
              aria-label={f.label}
              width={f.width}
              value={get(f.name) || 'all'}
              onValueChange={(v) => set({ [f.name]: v === 'all' ? null : v })}
              items={[{ value: 'all', label: `All ${f.label.toLowerCase()}` }, ...f.options]}
            />
          ))}
          {actions}
        </>
      }
    />
  );
}

/** Hook for client tables: current page + a paginate handler that updates the URL. */
export function useUrlPagination() {
  const { get, set } = useUrlFilters();
  return {
    page: Number(get('page')) || 1,
    onPaginate: (page: number) => set({ page: page === 1 ? null : page }),
  };
}
