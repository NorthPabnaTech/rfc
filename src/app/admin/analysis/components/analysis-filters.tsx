'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';

import type { AnalysisPeriod, BusinessDTO } from '@/types';
import { DatePicker, DateRangePicker } from '@components/ui/date-picker';
import { Select } from '@components/ui/select';
import { cn } from '@lib/utils';

const PRESETS: { id: AnalysisPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
  { id: 'date', label: 'Specific date' },
  { id: 'custom', label: 'Custom range' },
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
    router.push(`/admin/analysis?${next.toString()}`);
  };

  return (
    <section className="bg-panel hairline rounded-xl2 mb-6 flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              if (p.id === 'date') {
                update({ period: 'date', date: date || to, from: undefined, to: undefined });
              } else if (p.id === 'custom') {
                update({ period: 'custom', from, to, date: undefined });
              } else {
                update({ period: p.id, date: undefined, from: undefined, to: undefined });
              }
            }}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition',
              period === p.id
                ? 'bg-noir border-noir text-white'
                : 'border-line-2/70 text-ink hover:border-ink bg-white',
            )}
          >
            {p.label}
          </button>
        ))}

        {period === 'date' && (
          <DatePicker
            size="sm"
            value={date || to}
            onChange={(val) => val && update({ period: 'date', date: val })}
            className="w-40"
          />
        )}

        {period === 'custom' && (
          <DateRangePicker
            size="sm"
            value={{ from, to }}
            onChange={(r) => {
              if (r.from && r.to) {
                update({ period: 'custom', from: r.from, to: r.to });
              }
            }}
            className="w-64"
          />
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <span className="text-subtle text-[12px] font-medium whitespace-nowrap">Business:</span>
        <Select
          aria-label="Filter by business"
          value={business}
          onValueChange={(v) => update({ business: v === 'all' ? undefined : v })}
          items={[
            { value: 'all', label: 'All businesses (Combined)' },
            ...businesses.map((b) => ({ value: b.slug, label: b.name })),
          ]}
          className="w-56"
        />
      </div>
    </section>
  );
}
