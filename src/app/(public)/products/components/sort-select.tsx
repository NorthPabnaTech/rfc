'use client';

import { Select } from '@components/ui/select';
import { useUrlFilters } from '@hooks/use-url-filters';
import { PRODUCT_SORT_LABELS, PRODUCT_SORTS } from '@lib/constants';

export function SortSelect() {
  const { get, set } = useUrlFilters();
  return (
    <div className="w-48">
      <Select
        aria-label="Sort products"
        value={get('sort') || 'newest'}
        onValueChange={(v) => set({ sort: v === 'newest' ? null : v })}
        items={PRODUCT_SORTS.map((s) => ({ value: s, label: PRODUCT_SORT_LABELS[s] }))}
        className="rounded-full"
      />
    </div>
  );
}
