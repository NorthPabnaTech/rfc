'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';

import type { AnalysisPeriod, BusinessDTO } from '@/types';
import { DatePicker, DateRangePicker } from '@components/ui/date-picker';
import { Select } from '@components/ui/select';

const PERIOD_ITEMS: { value: AnalysisPeriod; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'date', label: 'Specific date' },
  { value: 'custom', label: 'Custom range' },
];

export function AnalysisFilters({
  period,
  date,
  from,
  to,
  business,
  businesses,
}: {
  period: AnalysisPeriod;
  date?: string;
  from: string;
  to: string;
  business: string;
  businesses: BusinessDTO[];
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (!v) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.push(qs ? `/admin/analysis?${qs}` : '/admin/analysis');
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Select
        size="md"
        clearable
        onClear={() => update({ period: undefined, date: undefined, from: undefined, to: undefined })}
        aria-label="Filter by date range"
        value={period}
        onValueChange={(val) => {
          const nextPeriod = val as AnalysisPeriod;
          if (nextPeriod === 'all') {
            update({ period: undefined, date: undefined, from: undefined, to: undefined });
          } else if (nextPeriod === 'date') {
            update({ period: 'date', date: date || to, from: undefined, to: undefined });
          } else if (nextPeriod === 'custom') {
            update({ period: 'custom', from, to, date: undefined });
          } else {
            update({ period: nextPeriod, date: undefined, from: undefined, to: undefined });
          }
        }}
        items={PERIOD_ITEMS}
        className="w-40"
      />

      {period === 'date' && (
        <DatePicker
          size="md"
          value={date || to}
          onChange={(val) => val && update({ period: 'date', date: val })}
          className="w-44"
        />
      )}

      {period === 'custom' && (
        <DateRangePicker
          size="md"
          value={{ from, to }}
          onChange={(r) => {
            if (r.from && r.to) {
              update({ period: 'custom', from: r.from, to: r.to });
            }
          }}
          className="w-60"
        />
      )}

      <Select
        size="md"
        clearable
        onClear={() => update({ business: undefined })}
        aria-label="Filter by business"
        value={business}
        onValueChange={(v) => update({ business: v === 'all' ? undefined : v })}
        items={[
          { value: 'all', label: 'All businesses' },
          ...businesses.map((b) => ({ value: b.slug, label: b.name })),
        ]}
        className="w-44"
      />
    </div>
  );
}
