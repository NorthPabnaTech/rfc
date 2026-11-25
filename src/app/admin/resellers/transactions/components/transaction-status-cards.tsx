'use client';

import type { IconRegistryKey } from '@components/icon/icon';
import { StatCard, StatCardGrid, type StatCardTone } from '@components/shared';
import { useUrlFilters } from '@hooks/use-url-filters';
import { formatNumber } from '@lib/utils';

const CARDS: {
  value: '' | 'pending' | 'completed' | 'rejected';
  label: string;
  icon: IconRegistryKey;
  tone: StatCardTone;
}[] = [
  { value: '', label: 'Total transactions', icon: 'coin', tone: 'neutral' },
  { value: 'pending', label: 'Pending', icon: 'clock', tone: 'warn' },
  { value: 'completed', label: 'Completed', icon: 'checkCircle', tone: 'ok' },
  { value: 'rejected', label: 'Rejected', icon: 'cancelCircle', tone: 'danger' },
];

export function TransactionStatusCards({
  counts,
}: {
  counts: { total: number; pending: number; completed: number; rejected: number };
}) {
  const { get, set } = useUrlFilters();
  const current = get('status');

  return (
    <StatCardGrid className="lg:grid-cols-4">
      {CARDS.map((card) => {
        const count = card.value === '' ? counts.total : counts[card.value];
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
