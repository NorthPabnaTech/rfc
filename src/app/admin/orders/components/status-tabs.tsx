'use client';

import { useUrlFilters } from '@hooks/use-url-filters';
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from '@lib/constants';
import { cn } from '@lib/utils';

/** Status filter pills with live counts. */
export function StatusTabs({ counts }: { counts: Record<string, number> }) {
  const { get, set } = useUrlFilters();
  const active = get('status');
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const tabs = [
    { value: '', label: 'All', count: total },
    ...ORDER_STATUSES.map((s) => ({
      value: s,
      label: ORDER_STATUS_LABELS[s],
      count: counts[s] ?? 0,
    })),
  ];

  return (
    <div className="scrollbar-hidden mb-4 flex gap-1.5 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.value || 'all'}
          type="button"
          onClick={() => set({ status: t.value || null })}
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition',
            active === t.value ? 'bg-noir text-white' : 'hairline text-ink hover:bg-well bg-white',
          )}
        >
          {t.label}
          <span
            className={cn(
              'rounded-full px-1.5 text-[11px] font-bold',
              active === t.value
                ? 'bg-white/15 text-white'
                : t.value === 'pending' && t.count > 0
                  ? 'bg-brand text-brand-contrast'
                  : 'bg-well text-muted',
            )}
          >
            {t.count}
          </span>
        </button>
      ))}
    </div>
  );
}
