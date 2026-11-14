'use client';

import type { IconRegistryKey } from '@components/icon/icon';
import { StatCard, StatCardGrid, type StatCardTone } from '@components/shared';
import { useUrlFilters } from '@hooks/use-url-filters';
import { formatNumber } from '@lib/utils';

const SUMMARY_CARDS: Array<{
  value: string;
  label: string;
  icon: IconRegistryKey;
  tone: StatCardTone;
}> = [
  { value: '', label: 'All orders', icon: 'cart', tone: 'info' },
  { value: 'pending', label: 'Pending', icon: 'clock', tone: 'warn' },
  { value: 'delivered', label: 'Delivered', icon: 'delivered', tone: 'ok' },
  { value: 'cancelled', label: 'Cancelled', icon: 'cancelCircle', tone: 'danger' },
];

/** Top 4 clickable order-status summary cards. */
export function StatusTabs({ counts }: { counts: Record<string, number> }) {
  const { get, set } = useUrlFilters();
  const active = get('status');
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <StatCardGrid>
      {SUMMARY_CARDS.map((card) => {
        const count = card.value === '' ? total : (counts[card.value] ?? 0);
        return (
          <StatCard
            key={card.value || 'all'}
            label={card.label}
            value={formatNumber(count)}
            icon={card.icon}
            tone={card.tone}
            active={active === card.value}
            onClick={() => set({ status: card.value || null })}
          />
        );
      })}
    </StatCardGrid>
  );
}
