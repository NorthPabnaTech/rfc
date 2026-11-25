'use client';

import type { IconRegistryKey } from '@components/icon/icon';
import { StatCard, StatCardGrid, type StatCardTone } from '@components/shared';
import { useUrlFilters } from '@hooks/use-url-filters';
import { formatNumber } from '@lib/utils';

const CARDS: {
  value: '' | 'open' | 'in_progress' | 'resolved';
  label: string;
  icon: IconRegistryKey;
  tone: StatCardTone;
}[] = [
  { value: '', label: 'Total tickets', icon: 'question', tone: 'neutral' },
  { value: 'open', label: 'Open', icon: 'inbox', tone: 'warn' },
  { value: 'in_progress', label: 'In Progress', icon: 'clock', tone: 'info' },
  { value: 'resolved', label: 'Resolved', icon: 'checkCircle', tone: 'ok' },
];

export function TicketStatusCards({
  counts,
}: {
  counts: { total: number; open: number; in_progress: number; resolved: number };
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
