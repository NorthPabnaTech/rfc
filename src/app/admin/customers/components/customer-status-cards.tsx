'use client';

import type { IconRegistryKey } from '@components/icon/icon';
import { StatCard, StatCardGrid, type StatCardTone } from '@components/shared';
import { useUrlFilters } from '@hooks/use-url-filters';
import { formatNumber } from '@lib/utils';

const CARDS: {
  value: '' | 'active' | 'disabled';
  label: string;
  icon: IconRegistryKey;
  tone: StatCardTone;
}[] = [
  { value: '', label: 'Total customers', icon: 'users', tone: 'neutral' },
  { value: 'active', label: 'Active', icon: 'checkCircle', tone: 'ok' },
  { value: 'disabled', label: 'Disabled', icon: 'cancelCircle', tone: 'danger' },
];

export function CustomerStatusCards({
  counts,
}: {
  counts: { total: number; active: number; disabled: number };
}) {
  const { get, set } = useUrlFilters();
  const current = get('status');

  return (
    <StatCardGrid className="lg:grid-cols-3">
      {CARDS.map((card) => {
        const count =
          card.value === ''
            ? counts.total
            : card.value === 'active'
              ? counts.active
              : counts.disabled;
        return (
          <StatCard
            key={card.value || 'all'}
            label={card.label}
            value={formatNumber(count)}
            icon={card.icon}
            tone={card.tone}
            active={current === card.value}
            onClick={() => set({ status: card.value || null })}
          />
        );
      })}
    </StatCardGrid>
  );
}
